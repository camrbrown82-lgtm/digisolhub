import type { SupabaseClient } from "@supabase/supabase-js";
import { logAgentActivity } from "@/lib/agent/digisol/activityLog";
import { ensureDigisolDailyUsageSchema } from "@/lib/ensureDigisolDailyUsageSchema";

/**
 * DigiSol bootstrap hard cap: exactly 5 automated audits + outreach emails / UTC day.
 * Manual dashboard invocations are not counted here.
 */
export const DIGISOL_DAILY_AUTOMATED_AUDIT_CAP = 5;
export const DIGISOL_DAILY_AUTOMATED_EMAIL_CAP = 5;

/** Tiny token runway for gpt-4o-mini drafts tied to those 5 audits (~1.5k × 5). */
export const DIGISOL_DAILY_AUTOMATED_TOKEN_CAP = 8_000;

export type DigisolDailyUsageRow = {
  day_key: string;
  client_id: string | null;
  audits_used: number;
  emails_used: number;
  tokens_used: number;
  tool_calls_used: number;
  blocked: boolean;
};

export type DigisolDailySnapshot = {
  dayKey: string;
  auditsUsed: number;
  emailsUsed: number;
  tokensUsed: number;
  toolCallsUsed: number;
  auditsRemaining: number;
  emailsRemaining: number;
  tokensRemaining: number;
  blocked: boolean;
  cap: {
    audits: number;
    emails: number;
    tokens: number;
  };
};

export function utcDayKey(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

export async function getDigisolDailyUsage(
  supabase: SupabaseClient,
  clientId?: string | null,
): Promise<DigisolDailySnapshot> {
  await ensureDigisolDailyUsageSchema().catch(() => null);
  const dayKey = utcDayKey();

  const { data } = await supabase
    .from("digisol_daily_usage")
    .select("*")
    .eq("day_key", dayKey)
    .maybeSingle();

  const row = data as DigisolDailyUsageRow | null;
  const auditsUsed = row?.audits_used ?? 0;
  const emailsUsed = row?.emails_used ?? 0;
  const tokensUsed = row?.tokens_used ?? 0;
  const toolCallsUsed = row?.tool_calls_used ?? 0;
  const blocked =
    Boolean(row?.blocked) ||
    auditsUsed >= DIGISOL_DAILY_AUTOMATED_AUDIT_CAP ||
    emailsUsed >= DIGISOL_DAILY_AUTOMATED_EMAIL_CAP;

  return {
    dayKey,
    auditsUsed,
    emailsUsed,
    tokensUsed,
    toolCallsUsed,
    auditsRemaining: Math.max(0, DIGISOL_DAILY_AUTOMATED_AUDIT_CAP - auditsUsed),
    emailsRemaining: Math.max(0, DIGISOL_DAILY_AUTOMATED_EMAIL_CAP - emailsUsed),
    tokensRemaining: Math.max(0, DIGISOL_DAILY_AUTOMATED_TOKEN_CAP - tokensUsed),
    blocked,
    cap: {
      audits: DIGISOL_DAILY_AUTOMATED_AUDIT_CAP,
      emails: DIGISOL_DAILY_AUTOMATED_EMAIL_CAP,
      tokens: DIGISOL_DAILY_AUTOMATED_TOKEN_CAP,
    },
  };
}

export async function assertDigisolAutomatedAllowance(input: {
  supabase: SupabaseClient;
  clientId: string;
  audits?: number;
  emails?: number;
  tokens?: number;
  toolName?: string;
}): Promise<DigisolDailySnapshot> {
  const needAudits = Math.max(0, Math.floor(input.audits ?? 0));
  const needEmails = Math.max(0, Math.floor(input.emails ?? 0));
  const needTokens = Math.max(0, Math.floor(input.tokens ?? 0));
  const snap = await getDigisolDailyUsage(input.supabase, input.clientId);

  let allowed = !snap.blocked;
  let reason = "";
  let code = "ok";

  if (snap.blocked) {
    allowed = false;
    code = "digisol_daily_cap_reached";
    reason = `DigiSol daily automated cap reached (${DIGISOL_DAILY_AUTOMATED_AUDIT_CAP} audits / emails). Automated prospecting and token spend are blocked until the next UTC day. Open the Hub dashboard to run agents manually.`;
  } else if (needAudits > snap.auditsRemaining) {
    allowed = false;
    code = "digisol_daily_audit_cap";
    reason = `DigiSol daily automated audit cap exceeded (need ${needAudits}, remaining ${snap.auditsRemaining} of ${DIGISOL_DAILY_AUTOMATED_AUDIT_CAP}).`;
  } else if (needEmails > snap.emailsRemaining) {
    allowed = false;
    code = "digisol_daily_email_cap";
    reason = `DigiSol daily automated email cap exceeded (need ${needEmails}, remaining ${snap.emailsRemaining} of ${DIGISOL_DAILY_AUTOMATED_EMAIL_CAP}).`;
  } else if (needTokens > snap.tokensRemaining) {
    allowed = false;
    code = "digisol_daily_token_cap";
    reason = `DigiSol daily automated token cap exceeded (need ${needTokens}, remaining ${snap.tokensRemaining}).`;
  }

  await logAgentActivity({
    supabase: input.supabase,
    clientId: input.clientId,
    action: allowed ? "budget:digisol_daily_ok" : "budget:digisol_daily_blocked",
    toolName: input.toolName || "assertDigisolAutomatedAllowance",
    status: allowed ? "ok" : "error",
    input: { needAudits, needEmails, needTokens, invocation: "automated" },
    output: snap,
    errorMessage: allowed ? null : reason,
    metadata: { code, dayKey: snap.dayKey },
  });

  if (!allowed) {
    const { AgentError } = await import("@/lib/agent/errors");
    throw new AgentError(reason, 402, code);
  }

  return snap;
}

export async function incrementDigisolDailyUsage(input: {
  supabase: SupabaseClient;
  clientId: string;
  audits?: number;
  emails?: number;
  tokens?: number;
  toolCalls?: number;
  toolName?: string;
}) {
  await ensureDigisolDailyUsageSchema().catch(() => null);
  const dayKey = utcDayKey();
  const audits = Math.max(0, Math.floor(input.audits ?? 0));
  const emails = Math.max(0, Math.floor(input.emails ?? 0));
  const tokens = Math.max(0, Math.floor(input.tokens ?? 0));
  const toolCalls = Math.max(0, Math.floor(input.toolCalls ?? 0));

  if (audits + emails + tokens + toolCalls === 0) {
    return getDigisolDailyUsage(input.supabase, input.clientId);
  }

  const current = await getDigisolDailyUsage(input.supabase, input.clientId);
  const nextAudits = current.auditsUsed + audits;
  const nextEmails = current.emailsUsed + emails;
  const nextTokens = current.tokensUsed + tokens;
  const nextTools = current.toolCallsUsed + toolCalls;
  const blocked =
    nextAudits >= DIGISOL_DAILY_AUTOMATED_AUDIT_CAP ||
    nextEmails >= DIGISOL_DAILY_AUTOMATED_EMAIL_CAP;

  const { error } = await input.supabase.from("digisol_daily_usage").upsert(
    {
      day_key: dayKey,
      client_id: input.clientId,
      audits_used: nextAudits,
      emails_used: nextEmails,
      tokens_used: nextTokens,
      tool_calls_used: nextTools,
      blocked,
      metadata: {
        lastTool: input.toolName ?? null,
        updatedAt: new Date().toISOString(),
      },
    },
    { onConflict: "day_key" },
  );

  if (error) {
    console.warn("[digisol_daily_usage]", error.message);
  }

  const snap = await getDigisolDailyUsage(input.supabase, input.clientId);

  await logAgentActivity({
    supabase: input.supabase,
    clientId: input.clientId,
    action: "budget:digisol_daily_increment",
    toolName: input.toolName || "incrementDigisolDailyUsage",
    status: "ok",
    input: { audits, emails, tokens, toolCalls },
    output: snap,
    metadata: { dayKey, blocked: snap.blocked },
  });

  return snap;
}
