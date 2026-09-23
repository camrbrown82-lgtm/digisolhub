import type { SupabaseClient } from "@supabase/supabase-js";
import { runWebsiteAudit } from "@/lib/agent/websiteAudit";
import { logAgentActivity } from "@/lib/agent/digisol/activityLog";
import { DIGISOL_OPERATOR } from "@/lib/agent/digisol/scope";
import { AgentError } from "@/lib/agent/errors";
import { ensureAgentActivityLogSchema } from "@/lib/ensureAgentActivityLogSchema";
import { ensureProspectsSchema } from "@/lib/ensureProspectsSchema";
import { ensureWebsiteAuditSchema } from "@/lib/ensureWebsiteAuditSchema";
import { getOpenAIApiKey } from "@/lib/openai";
import { getResendApiKey } from "@/lib/email";
import { evaluateCaslPublishedContact } from "@/lib/prospectAudit/casl";
import { sendProspectAuditEmail } from "@/lib/prospectAudit/email";
import { ensureProspectQueue } from "@/lib/prospectAudit/ensureQueue";
import {
  DEFAULT_PROSPECT_TRADES,
  PROSPECT_AUDIT_BATCH_DEFAULT,
  PROSPECT_AUDIT_MAX_OUTPUT_TOKENS,
  PROSPECT_AUDIT_MODEL,
  resolveProspectBatchSize,
  resolveProspectDailyMax,
  utcDayStartIso,
  type ProspectTrade,
} from "@/lib/prospectAudit/limits";
import { promoteProspectOnEngagement } from "@/lib/prospectAudit/promote";
import { draftProspectAuditSummary } from "@/lib/prospectAudit/summary";
import { ensureDigisolClient } from "@/lib/workspace";
import {
  checkAgentBudget,
  getDigisolDailyUsage,
  recordAgentUsage,
} from "@/lib/agent/budget";
import { ensureDigisolDailyUsageSchema } from "@/lib/ensureDigisolDailyUsageSchema";
import { ensureClientAiWalletSchema } from "@/lib/ensureClientAiWalletSchema";

export type ProspectAuditWorkerOptions = {
  db: SupabaseClient;
  trades?: ProspectTrade[];
  dailyMax?: number;
  batchSize?: number;
  /** When true, audit + CASL check run but Resend is skipped. */
  dryRun?: boolean;
};

export type ProspectAuditWorkerResult = {
  ok: true;
  operator: string;
  dailyMax: number;
  processedTodayBefore: number;
  remainingDaily: number;
  batchSize: number;
  model: string;
  maxOutputTokens: number;
  dryRun: boolean;
  queueSeed?: {
    pendingBefore: number;
    inserted: number;
    skippedExisting: number;
    catalogRemaining: number;
  };
  results: Array<Record<string, unknown>>;
  totals: {
    attempted: number;
    audited: number;
    emailed: number;
    caslBlocked: number;
    failed: number;
    tokensPrompt: number;
    tokensCompletion: number;
    tokensTotal: number;
  };
};

export { promoteProspectOnEngagement };

/**
 * Cost-capped DigiSol local prospect auditor.
 * Hard-limited to exactly 5 automated audits/emails per UTC day on gpt-4o-mini.
 * Manual Hub dashboard runs are not gated by this worker.
 */
export async function runProspectAuditWorker(
  opts: ProspectAuditWorkerOptions,
): Promise<ProspectAuditWorkerResult> {
  await Promise.all([
    Promise.race([
      ensureProspectsSchema().catch(() => null),
      new Promise((r) => setTimeout(r, 4000)),
    ]),
    Promise.race([
      ensureWebsiteAuditSchema().catch(() => null),
      new Promise((r) => setTimeout(r, 4000)),
    ]),
    Promise.race([
      ensureAgentActivityLogSchema().catch(() => null),
      new Promise((r) => setTimeout(r, 4000)),
    ]),
    Promise.race([
      ensureDigisolDailyUsageSchema().catch(() => null),
      new Promise((r) => setTimeout(r, 4000)),
    ]),
    Promise.race([
      ensureClientAiWalletSchema().catch(() => null),
      new Promise((r) => setTimeout(r, 4000)),
    ]),
  ]);

  if (!getOpenAIApiKey()) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const clientId = await ensureDigisolClient(opts.db);
  if (!clientId) {
    throw new Error("DigiSol house profile is missing");
  }

  // Auto-fill empty/low queue from Alberta catalog (root cause of "no prospects").
  let queueSeed: ProspectAuditWorkerResult["queueSeed"];
  try {
    queueSeed = await ensureProspectQueue(opts.db, clientId, {
      minPending: PROSPECT_AUDIT_BATCH_DEFAULT,
      fillCount: 12,
    });
  } catch (seedErr) {
    console.warn(
      "[prospect-audit] queue seed failed",
      seedErr instanceof Error ? seedErr.message : seedErr,
    );
    queueSeed = {
      pendingBefore: 0,
      inserted: 0,
      skippedExisting: 0,
      catalogRemaining: 0,
    };
  }

  // DigiSol bootstrap: hard stop when daily automated audit/email cap is spent.
  const digisolDaily = await getDigisolDailyUsage(opts.db, clientId);
  const dailyMax = resolveProspectDailyMax(opts.dailyMax);
  const remainingFromDigisolCap = digisolDaily.auditsRemaining;
  const dayStart = utcDayStartIso();
  const { count: processedTodayBefore } = await opts.db
    .from("prospects")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId)
    .gte("last_audited_at", dayStart);

  const usedToday = Math.max(processedTodayBefore ?? 0, digisolDaily.auditsUsed);
  const remainingDaily = Math.min(
    Math.max(0, dailyMax - usedToday),
    remainingFromDigisolCap,
  );
  const batchSize = resolveProspectBatchSize(remainingDaily, opts.batchSize);
  const dryRun = opts.dryRun === true;
  const trades =
    opts.trades && opts.trades.length > 0
      ? opts.trades.map((t) => String(t).toLowerCase())
      : [...DEFAULT_PROSPECT_TRADES];

  await checkAgentBudget(
    clientId,
    { audits: batchSize > 0 ? 1 : 0, emails: 0, tokens: 0, toolCalls: 1 },
    {
      supabase: opts.db,
      toolName: "runProspectAuditWorker",
      invocation: "automated",
      throwOnDeny: batchSize > 0,
    },
  );

  await logAgentActivity({
    supabase: opts.db,
    clientId,
    action: "prospect_audit:run_started",
    toolName: "runProspectAuditWorker",
    status: "started",
    model: PROSPECT_AUDIT_MODEL,
    input: {
      dailyMax,
      usedToday,
      remainingDaily,
      batchSize,
      trades,
      dryRun,
      maxOutputTokens: PROSPECT_AUDIT_MAX_OUTPUT_TOKENS,
    },
  });

  const totals = {
    attempted: 0,
    audited: 0,
    emailed: 0,
    caslBlocked: 0,
    failed: 0,
    tokensPrompt: 0,
    tokensCompletion: 0,
    tokensTotal: 0,
  };
  const results: Array<Record<string, unknown>> = [];

  if (batchSize === 0) {
    await logAgentActivity({
      supabase: opts.db,
      clientId,
      action: "prospect_audit:daily_cap_reached",
      toolName: "runProspectAuditWorker",
      status: "finished",
      model: PROSPECT_AUDIT_MODEL,
      output: { usedToday, dailyMax },
    });

    return {
      ok: true,
      operator: DIGISOL_OPERATOR.name,
      dailyMax,
      processedTodayBefore: usedToday,
      remainingDaily,
      batchSize,
      model: PROSPECT_AUDIT_MODEL,
      maxOutputTokens: PROSPECT_AUDIT_MAX_OUTPUT_TOKENS,
      dryRun,
      queueSeed,
      results: [{ skipped: true, reason: "daily_cap_reached" }],
      totals,
    };
  }

  const { data: prospects, error: listError } = await opts.db
    .from("prospects")
    .select(
      "id, business_name, url, trade, city, contact_email, audit_status, casl_status",
    )
    .eq("client_id", clientId)
    .in("trade", trades)
    .in("audit_status", ["pending", "failed"])
    .order("created_at", { ascending: true })
    .limit(batchSize);

  if (listError) {
    throw new Error(listError.message);
  }

  if (!prospects?.length) {
    await logAgentActivity({
      supabase: opts.db,
      clientId,
      action: "prospect_audit:empty_queue",
      toolName: "runProspectAuditWorker",
      status: "finished",
      model: PROSPECT_AUDIT_MODEL,
      output: { queueSeed, trades },
    });
    return {
      ok: true,
      operator: DIGISOL_OPERATOR.name,
      dailyMax,
      processedTodayBefore: usedToday,
      remainingDaily,
      batchSize,
      model: PROSPECT_AUDIT_MODEL,
      maxOutputTokens: PROSPECT_AUDIT_MAX_OUTPUT_TOKENS,
      dryRun,
      queueSeed,
      results: [
        {
          skipped: true,
          reason: "empty_queue",
          note: "No pending prospects after seed — expand ALBERTA_PROSPECT_SEED.",
        },
      ],
      totals,
    };
  }

  for (const prospect of prospects ?? []) {
    // Re-assert DigiSol daily cap before each prospect (blocks mid-batch once spent).
    try {
      await checkAgentBudget(
        clientId,
        { audits: 1, emails: 0, tokens: 0, toolCalls: 1 },
        {
          supabase: opts.db,
          toolName: "runProspectAuditWorker",
          invocation: "automated",
          throwOnDeny: true,
        },
      );
    } catch (err) {
      if (
        !(err instanceof AgentError) ||
        !String(err.code || "").startsWith("digisol_daily")
      ) {
        throw err;
      }
      await logAgentActivity({
        supabase: opts.db,
        clientId,
        action: "prospect_audit:daily_cap_mid_batch",
        toolName: "runProspectAuditWorker",
        status: "finished",
        model: PROSPECT_AUDIT_MODEL,
        output: { ...totals, stoppedAtProspectId: prospect.id },
        errorMessage: err.message,
      });
      break;
    }

    totals.attempted += 1;
    const rowResult = await processOneProspect({
      db: opts.db,
      clientId,
      prospect,
      dryRun,
    });
    results.push(rowResult);

    totals.tokensPrompt += Number(rowResult.tokensPrompt || 0);
    totals.tokensCompletion += Number(rowResult.tokensCompletion || 0);
    totals.tokensTotal += Number(rowResult.tokensTotal || 0);

    if (rowResult.status === "emailed" || rowResult.status === "audited") {
      totals.audited += 1;
    }
    if (rowResult.status === "emailed") totals.emailed += 1;
    if (rowResult.status === "casl_blocked") totals.caslBlocked += 1;
    if (rowResult.status === "failed") totals.failed += 1;

    const countedAudit =
      rowResult.status === "emailed" ||
      rowResult.status === "audited" ||
      rowResult.status === "casl_blocked";
    if (countedAudit || Number(rowResult.tokensTotal || 0) > 0) {
      await recordAgentUsage(
        clientId,
        {
          audits: countedAudit ? 1 : 0,
          emails: rowResult.status === "emailed" ? 1 : 0,
          tokens: Number(rowResult.tokensTotal || 0),
          promptTokens: Number(rowResult.tokensPrompt || 0),
          completionTokens: Number(rowResult.tokensCompletion || 0),
          toolCalls: 1,
          model: PROSPECT_AUDIT_MODEL,
          toolName: "runProspectAuditWorker",
        },
        { supabase: opts.db, invocation: "automated" },
      );
    }
  }

  await logAgentActivity({
    supabase: opts.db,
    clientId,
    action: "prospect_audit:run_finished",
    toolName: "runProspectAuditWorker",
    status: "finished",
    model: PROSPECT_AUDIT_MODEL,
    output: totals,
    metadata: {
      dailyMax,
      remainingAfter: Math.max(0, remainingDaily - totals.attempted),
      costControls: {
        model: PROSPECT_AUDIT_MODEL,
        maxOutputTokens: PROSPECT_AUDIT_MAX_OUTPUT_TOKENS,
        dailyMax,
        digisolDailyCap: digisolDaily.cap,
      },
    },
  });

  return {
    ok: true,
    operator: DIGISOL_OPERATOR.name,
    dailyMax,
    processedTodayBefore: usedToday,
    remainingDaily,
    batchSize,
    model: PROSPECT_AUDIT_MODEL,
    maxOutputTokens: PROSPECT_AUDIT_MAX_OUTPUT_TOKENS,
    dryRun,
    queueSeed,
    results,
    totals,
  };
}

async function processOneProspect(input: {
  db: SupabaseClient;
  clientId: string;
  dryRun: boolean;
  prospect: {
    id: string;
    business_name: string | null;
    url: string;
    trade: string;
    city: string | null;
    contact_email: string | null;
    audit_status: string;
    casl_status: string;
  };
}) {
  const { db, clientId, prospect, dryRun } = input;
  const now = new Date().toISOString();

  await db
    .from("prospects")
    .update({ audit_status: "processing", error_message: null })
    .eq("id", prospect.id);

  try {
    const audit = await runWebsiteAudit(prospect.url, { includeHtml: true });
    const html = audit.html || "";
    const casl = evaluateCaslPublishedContact(html, audit.finalUrl || prospect.url);

    if (!casl.eligible || !casl.email) {
      await db
        .from("prospects")
        .update({
          last_audited_at: now,
          audit_score: audit.score,
          audit_report: {
            score: audit.score,
            report: audit.report,
            issues: audit.issues.slice(0, 12),
            seo: audit.seo,
            metrics: audit.metrics,
          },
          contact_email: casl.email || prospect.contact_email,
          casl_status: "blocked",
          casl_basis: casl.basis,
          casl_evidence: casl.evidence,
          audit_status: "casl_blocked",
          error_message: casl.reason,
          tokens_prompt: 0,
          tokens_completion: 0,
          tokens_total: 0,
        })
        .eq("id", prospect.id);

      await logAgentActivity({
        supabase: db,
        clientId,
        action: "prospect_audit:casl_blocked",
        toolName: "processOneProspect",
        status: "ok",
        model: PROSPECT_AUDIT_MODEL,
        input: { prospectId: prospect.id, url: prospect.url },
        output: {
          reason: casl.reason,
          tokens: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
          note: "Skipped gpt-4o-mini — CASL gate failed before summary.",
        },
      });

      return {
        prospectId: prospect.id,
        status: "casl_blocked",
        reason: casl.reason,
        score: audit.score,
        tokensPrompt: 0,
        tokensCompletion: 0,
        tokensTotal: 0,
      };
    }

    // Only spend mini-model tokens after CASL eligibility is confirmed.
    const summary = await draftProspectAuditSummary({
      businessName: prospect.business_name,
      trade: prospect.trade,
      url: prospect.url,
      html,
      audit,
    });

    const tokenPatch = {
      tokens_prompt: summary.usage.promptTokens,
      tokens_completion: summary.usage.completionTokens,
      tokens_total: summary.usage.totalTokens,
      last_audited_at: now,
      audit_score: audit.score,
      audit_summary: summary.summary,
      audit_report: {
        score: audit.score,
        report: audit.report,
        issues: audit.issues.slice(0, 12),
        seo: audit.seo,
        metrics: audit.metrics,
        weaknesses: summary.weaknesses,
        opener: summary.opener,
        subject: summary.subject,
      },
      contact_email: casl.email || prospect.contact_email,
      casl_status: "eligible",
      casl_basis: casl.basis,
      casl_evidence: casl.evidence,
    };

    if (dryRun || !getResendApiKey()) {
      await db
        .from("prospects")
        .update({
          ...tokenPatch,
          audit_status: "audited",
          error_message: dryRun
            ? "dry_run: email not sent"
            : "RESEND_API_KEY missing: email not sent",
        })
        .eq("id", prospect.id);

      await logAgentActivity({
        supabase: db,
        clientId,
        action: "prospect_audit:audited_no_send",
        toolName: "processOneProspect",
        status: "ok",
        model: PROSPECT_AUDIT_MODEL,
        input: { prospectId: prospect.id, dryRun },
        output: { score: audit.score, tokens: summary.usage, email: casl.email },
      });

      return {
        prospectId: prospect.id,
        status: "audited",
        dryRun: true,
        email: casl.email,
        score: audit.score,
        tokensPrompt: summary.usage.promptTokens,
        tokensCompletion: summary.usage.completionTokens,
        tokensTotal: summary.usage.totalTokens,
      };
    }

    const sent = await sendProspectAuditEmail({
      db,
      clientId,
      prospectId: prospect.id,
      businessName: prospect.business_name,
      email: casl.email,
      trade: prospect.trade,
      url: prospect.url,
      score: audit.score,
      summary,
    });

    await db
      .from("prospects")
      .update({
        ...tokenPatch,
        audit_status: "emailed",
        emailed_at: now,
        contact_id: sent.contactId,
        send_id: sent.sendId || null,
        resend_id: sent.resendId || null,
        casl_status: "sent",
        error_message: null,
      })
      .eq("id", prospect.id);

    await logAgentActivity({
      supabase: db,
      clientId,
      action: "prospect_audit:emailed",
      toolName: "processOneProspect",
      status: "ok",
      model: PROSPECT_AUDIT_MODEL,
      input: { prospectId: prospect.id, email: casl.email },
      output: {
        score: audit.score,
        sendId: sent.sendId,
        resendId: sent.resendId,
        tokens: summary.usage,
        caslBasis: casl.basis,
      },
      metadata: {
        maxOutputTokens: PROSPECT_AUDIT_MAX_OUTPUT_TOKENS,
      },
    });

    return {
      prospectId: prospect.id,
      status: "emailed",
      email: casl.email,
      score: audit.score,
      sendId: sent.sendId,
      resendId: sent.resendId,
      tokensPrompt: summary.usage.promptTokens,
      tokensCompletion: summary.usage.completionTokens,
      tokensTotal: summary.usage.totalTokens,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Prospect audit failed";
    await db
      .from("prospects")
      .update({
        audit_status: "failed",
        error_message: message.slice(0, 2000),
        last_audited_at: now,
      })
      .eq("id", prospect.id);

    await logAgentActivity({
      supabase: db,
      clientId,
      action: "prospect_audit:failed",
      toolName: "processOneProspect",
      status: "error",
      model: PROSPECT_AUDIT_MODEL,
      input: { prospectId: prospect.id, url: prospect.url },
      errorMessage: message,
    });

    return {
      prospectId: prospect.id,
      status: "failed",
      error: message,
      tokensPrompt: 0,
      tokensCompletion: 0,
      tokensTotal: 0,
    };
  }
}
