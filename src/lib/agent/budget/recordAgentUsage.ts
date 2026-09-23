import type { SupabaseClient } from "@supabase/supabase-js";
import { logAgentActivity } from "@/lib/agent/digisol/activityLog";
import { incrementDigisolDailyUsage } from "@/lib/agent/budget/digisolDaily";
import type { AgentInvocationMode } from "@/lib/agent/budget/checkAgentBudget";
import {
  remainingFromWallet,
  resolveCompanyWallet,
  type EstimatedCost,
} from "@/lib/agent/budget/wallet";

export type RecordedUsage = EstimatedCost & {
  model?: string | null;
  toolName?: string | null;
  promptTokens?: number;
  completionTokens?: number;
};

/**
 * Persist exact (or best-known) token/tool consumption against the company wallet
 * and mirror the spend into agent_activity_logs for auditability.
 * DigiSol automated spend also increments the calendar-day bootstrap counters.
 */
export async function recordAgentUsage(
  companyId: string,
  usage: RecordedUsage,
  opts: {
    supabase: SupabaseClient;
    userId?: string | null;
    invocation?: AgentInvocationMode;
  },
) {
  const tokens = Math.max(
    0,
    Math.floor(
      usage.tokens ??
        (usage.promptTokens ?? 0) + (usage.completionTokens ?? 0),
    ),
  );
  const toolCalls = Math.max(0, Math.floor(usage.toolCalls ?? 0));
  const audits = Math.max(0, Math.floor(usage.audits ?? 0));
  const emails = Math.max(0, Math.floor(usage.emails ?? 0));
  const invocation = opts.invocation || "manual";

  if (tokens + toolCalls + audits + emails === 0) {
    return { skipped: true as const };
  }

  const resolved = await resolveCompanyWallet(opts.supabase, companyId);
  const wallet = resolved.wallet;

  const { data: updated, error } = await opts.supabase
    .from("client_ai_wallets")
    .update({
      token_used: wallet.token_used + tokens,
      tool_calls_used: wallet.tool_calls_used + toolCalls,
      audits_used: wallet.audits_used + audits,
      emails_dispatched: wallet.emails_dispatched + emails,
    })
    .eq("id", wallet.id)
    .select("*")
    .single();

  if (error) {
    await logAgentActivity({
      supabase: opts.supabase,
      userId: opts.userId,
      clientId: companyId,
      action: "budget:usage_record_failed",
      toolName: usage.toolName || "recordAgentUsage",
      status: "error",
      model: usage.model,
      errorMessage: error.message,
      input: { tokens, toolCalls, audits, emails, invocation },
    });
    return { ok: false as const, error: error.message };
  }

  let digisolDaily = null;
  if (resolved.isDigisol && invocation === "automated") {
    digisolDaily = await incrementDigisolDailyUsage({
      supabase: opts.supabase,
      clientId: companyId,
      audits,
      emails,
      tokens,
      toolCalls,
      toolName: usage.toolName || "recordAgentUsage",
    });
  }

  const remaining = remainingFromWallet(updated);

  await logAgentActivity({
    supabase: opts.supabase,
    userId: opts.userId,
    clientId: companyId,
    action: "budget:usage_recorded",
    toolName: usage.toolName || "recordAgentUsage",
    status: "ok",
    model: usage.model,
    input: {
      tokens,
      toolCalls,
      audits,
      emails,
      promptTokens: usage.promptTokens ?? null,
      completionTokens: usage.completionTokens ?? null,
      invocation,
    },
    output: {
      walletId: updated.id,
      token_used: updated.token_used,
      tool_calls_used: updated.tool_calls_used,
      audits_used: updated.audits_used,
      emails_dispatched: updated.emails_dispatched,
      remaining,
      isDigisol: resolved.isDigisol,
      pricingItemIds: resolved.pricingItemIds,
      digisolDaily,
    },
    metadata: {
      periodStart: updated.period_start,
      periodEnd: updated.period_end,
      invocation,
    },
  });

  return {
    ok: true as const,
    wallet: updated,
    remaining,
    spent: { tokens, toolCalls, audits, emails },
    digisolDaily,
  };
}
