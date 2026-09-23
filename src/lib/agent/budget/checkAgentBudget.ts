import type { SupabaseClient } from "@supabase/supabase-js";
import { AgentError } from "@/lib/agent/errors";
import { logAgentActivity } from "@/lib/agent/digisol/activityLog";
import {
  assertDigisolAutomatedAllowance,
  digisolBudgetsEnforced,
  DIGISOL_DAILY_AUTOMATED_AUDIT_CAP,
  DIGISOL_DAILY_AUTOMATED_EMAIL_CAP,
  getDigisolDailyUsage,
} from "@/lib/agent/budget/digisolDaily";
import {
  remainingFromWallet,
  resolveCompanyWallet,
  type EstimatedCost,
} from "@/lib/agent/budget/wallet";

export type AgentInvocationMode = "manual" | "automated";

export type BudgetCheckResult = {
  allowed: boolean;
  companyId: string;
  isDigisol: boolean;
  invocation: AgentInvocationMode;
  reason?: string;
  code?:
    | "ok"
    | "no_subscription"
    | "token_budget_exceeded"
    | "tool_call_budget_exceeded"
    | "audit_budget_exceeded"
    | "email_budget_exceeded"
    | "digisol_daily_cap_reached"
    | "digisol_daily_audit_cap"
    | "digisol_daily_email_cap"
    | "digisol_daily_token_cap"
    | "digisol_automated_generative_blocked";
  pricingItemIds: string[];
  estimated: Required<EstimatedCost>;
  remaining: {
    tokens: number;
    toolCalls: number;
    audits: number;
    emails: number;
  };
  walletId: string;
  periodStart: string;
  periodEnd: string;
  digisolDaily?: Awaited<ReturnType<typeof getDigisolDailyUsage>>;
};

const DIGISOL_AUTOMATED_GENERATIVE_TOOLS = new Set([
  "generateCampaignWorkflow",
  "dispatchSocialCampaign",
  "agent_orchestration",
  "runMasterAgent",
  "runAgent",
  "streamText",
]);

/**
 * Pre-flight budget gate for resource-heavy agent tools.
 *
 * - External clients: scale from active subscription → wallet allotments.
 * - DigiSol house (growth phase): unrestricted unless DIGISOL_ENFORCE_BUDGETS=1.
 */
export async function checkAgentBudget(
  companyId: string,
  estimatedCost: EstimatedCost,
  opts?: {
    supabase: SupabaseClient;
    userId?: string | null;
    toolName?: string;
    throwOnDeny?: boolean;
    /** automated = cron/background; manual = Hub dashboard operator */
    invocation?: AgentInvocationMode;
  },
): Promise<BudgetCheckResult> {
  if (!opts?.supabase) {
    throw new AgentError(
      "checkAgentBudget requires a Supabase client",
      500,
      "budget_misconfigured",
    );
  }
  if (!companyId?.trim()) {
    throw new AgentError("companyId is required for budget checks", 400, "missing_company");
  }

  const invocation: AgentInvocationMode = opts.invocation || "manual";
  const toolName = opts.toolName || "checkAgentBudget";

  const estimated: Required<EstimatedCost> = {
    tokens: Math.max(0, Math.floor(estimatedCost.tokens ?? 0)),
    toolCalls: Math.max(0, Math.floor(estimatedCost.toolCalls ?? 0)),
    audits: Math.max(0, Math.floor(estimatedCost.audits ?? 0)),
    emails: Math.max(0, Math.floor(estimatedCost.emails ?? 0)),
  };

  const resolved = await resolveCompanyWallet(opts.supabase, companyId.trim());
  const remaining = remainingFromWallet(resolved.wallet);

  let allowed = true;
  let code: BudgetCheckResult["code"] = "ok";
  let reason: string | undefined;
  let digisolDaily: BudgetCheckResult["digisolDaily"];

  // DigiSol house — growth phase: never block marketing / agents / prospecting.
  if (resolved.isDigisol && !digisolBudgetsEnforced()) {
    digisolDaily = await getDigisolDailyUsage(opts.supabase, companyId.trim());
    const result: BudgetCheckResult = {
      allowed: true,
      companyId: companyId.trim(),
      isDigisol: true,
      invocation,
      reason: undefined,
      code: "ok",
      pricingItemIds: resolved.pricingItemIds,
      estimated,
      remaining: {
        tokens: digisolDaily.tokensRemaining,
        toolCalls: Math.max(remaining.toolCalls, 1_000_000),
        audits: digisolDaily.auditsRemaining,
        emails: digisolDaily.emailsRemaining,
      },
      walletId: resolved.wallet.id,
      periodStart: resolved.wallet.period_start,
      periodEnd: resolved.wallet.period_end,
      digisolDaily,
    };

    await logAgentActivity({
      supabase: opts.supabase,
      userId: opts.userId,
      clientId: companyId.trim(),
      action: "budget:check_ok",
      toolName,
      status: "ok",
      input: { estimated, toolName, invocation, unrestricted: true },
      output: {
        allowed: true,
        code: "ok",
        isDigisol: true,
        invocation,
        unrestricted: true,
        remaining: result.remaining,
      },
      metadata: {
        periodStart: resolved.wallet.period_start,
        periodEnd: resolved.wallet.period_end,
      },
    });

    return result;
  }

  if (resolved.isDigisol && invocation === "automated") {
    digisolDaily = await getDigisolDailyUsage(opts.supabase, companyId.trim());

    // Only when budgets are re-enabled: block automated generative loops.
    if (DIGISOL_AUTOMATED_GENERATIVE_TOOLS.has(toolName)) {
      allowed = false;
      code = "digisol_automated_generative_blocked";
      reason =
        "DigiSol bootstrap mode blocks automated generative workflows. Run this from the Hub dashboard (manual) instead.";
    } else {
      try {
        digisolDaily = await assertDigisolAutomatedAllowance({
          supabase: opts.supabase,
          clientId: companyId.trim(),
          audits: estimated.audits,
          emails: estimated.emails,
          tokens: estimated.tokens,
          toolName,
        });
      } catch (err) {
        if (err instanceof AgentError) {
          allowed = false;
          code = err.code as BudgetCheckResult["code"];
          reason = err.message;
        } else {
          throw err;
        }
      }
    }
  } else if (!resolved.isDigisol && resolved.pricingItemIds.length === 0) {
    allowed = false;
    code = "no_subscription";
    reason =
      "No active DigiSol subscription found for this company. Agent tools are paused until a plan is active.";
  } else if (estimated.tokens > remaining.tokens) {
    allowed = false;
    code = "token_budget_exceeded";
    reason = `Token budget exceeded for this billing cycle (need ${estimated.tokens}, remaining ${remaining.tokens}).`;
  } else if (estimated.toolCalls > remaining.toolCalls) {
    allowed = false;
    code = "tool_call_budget_exceeded";
    reason = `Tool-call budget exceeded (need ${estimated.toolCalls}, remaining ${remaining.toolCalls}).`;
  } else if (estimated.audits > remaining.audits) {
    allowed = false;
    code = "audit_budget_exceeded";
    reason = `Website audit budget exceeded (need ${estimated.audits}, remaining ${remaining.audits}).`;
  } else if (estimated.emails > remaining.emails) {
    allowed = false;
    code = "email_budget_exceeded";
    reason = `Email dispatch budget exceeded (need ${estimated.emails}, remaining ${remaining.emails}).`;
  }

  // DigiSol manual with enforced budgets still respects monthly internal wallet.
  if (resolved.isDigisol && invocation === "manual" && digisolBudgetsEnforced()) {
    if (estimated.tokens > remaining.tokens) {
      allowed = false;
      code = "token_budget_exceeded";
      reason = `DigiSol internal monthly token budget exceeded (need ${estimated.tokens}, remaining ${remaining.tokens}).`;
    }
  }

  const result: BudgetCheckResult = {
    allowed,
    companyId: companyId.trim(),
    isDigisol: resolved.isDigisol,
    invocation,
    reason,
    code,
    pricingItemIds: resolved.pricingItemIds,
    estimated,
    remaining: resolved.isDigisol && invocation === "automated" && digisolDaily
      ? {
          tokens: digisolDaily.tokensRemaining,
          toolCalls: remaining.toolCalls,
          audits: digisolDaily.auditsRemaining,
          emails: digisolDaily.emailsRemaining,
        }
      : remaining,
    walletId: resolved.wallet.id,
    periodStart: resolved.wallet.period_start,
    periodEnd: resolved.wallet.period_end,
    digisolDaily,
  };

  await logAgentActivity({
    supabase: opts.supabase,
    userId: opts.userId,
    clientId: companyId.trim(),
    action: allowed ? "budget:check_ok" : "budget:check_denied",
    toolName,
    status: allowed ? "ok" : "error",
    input: { estimated, toolName, invocation },
    output: {
      allowed,
      code,
      isDigisol: resolved.isDigisol,
      invocation,
      pricingItemIds: resolved.pricingItemIds,
      remaining: result.remaining,
      walletId: resolved.wallet.id,
      digisolDailyCap: {
        audits: DIGISOL_DAILY_AUTOMATED_AUDIT_CAP,
        emails: DIGISOL_DAILY_AUTOMATED_EMAIL_CAP,
      },
      digisolDaily,
    },
    errorMessage: allowed ? null : reason,
    metadata: {
      periodStart: resolved.wallet.period_start,
      periodEnd: resolved.wallet.period_end,
    },
  });

  if (!allowed && opts.throwOnDeny !== false) {
    throw new AgentError(reason || "Agent budget exceeded", 402, code || "budget_exceeded");
  }

  return result;
}
