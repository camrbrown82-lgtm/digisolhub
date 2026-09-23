import { getPricingItem } from "@/lib/pricing";

/**
 * AI allotments keyed by existing pricing.ts item ids.
 * Does NOT redefine prices — only maps paid plans → agent resource caps.
 */
export type AiAllotment = {
  tokens: number;
  toolCalls: number;
  audits: number;
  emailDispatches: number;
};

/** Per pricing-item AI allowances for a billing cycle. */
export const AI_ALLOTMENTS_BY_PRICING_ID: Record<string, AiAllotment> = {
  // One-time packages — starter Hub AI runway after launch
  foundation: {
    tokens: 25_000,
    toolCalls: 40,
    audits: 8,
    emailDispatches: 50,
  },
  growth: {
    tokens: 60_000,
    toolCalls: 100,
    audits: 20,
    emailDispatches: 150,
  },
  full_funnel: {
    tokens: 120_000,
    toolCalls: 200,
    audits: 40,
    emailDispatches: 300,
  },
  // Monthly retainers — primary recurring AI budgets
  retainer_local: {
    tokens: 80_000,
    toolCalls: 120,
    audits: 25,
    emailDispatches: 200,
  },
  retainer_ads: {
    tokens: 50_000,
    toolCalls: 80,
    audits: 12,
    emailDispatches: 100,
  },
  retainer_full: {
    tokens: 180_000,
    toolCalls: 280,
    audits: 50,
    emailDispatches: 500,
  },
  // Add-ons
  addon_hub: {
    tokens: 15_000,
    toolCalls: 30,
    audits: 5,
    emailDispatches: 40,
  },
};

/** DigiSol internal monthly wallet for *manual* Hub dashboard agent use only. */
export function digisolInternalAllotment(): AiAllotment {
  return {
    // Manual dashboard runway — automated prospecting uses digisol_daily_usage (5/day).
    tokens: Number(process.env.DIGISOL_AI_TOKEN_BUDGET || 100_000) || 100_000,
    toolCalls: Number(process.env.DIGISOL_AI_TOOL_CALL_BUDGET || 500) || 500,
    audits: Number(process.env.DIGISOL_AI_AUDIT_BUDGET || 60) || 60,
    emailDispatches:
      Number(process.env.DIGISOL_AI_EMAIL_DISPATCH_BUDGET || 200) || 200,
  };
}

export function emptyAllotment(): AiAllotment {
  return { tokens: 0, toolCalls: 0, audits: 0, emailDispatches: 0 };
}

/**
 * Sum allotments for active pricing item ids.
 * Unknown ids are ignored (pricing catalog is source of truth for recognition).
 */
export function resolveAllotmentsForPricingIds(pricingItemIds: string[]): {
  allotment: AiAllotment;
  recognizedIds: string[];
  unrecognizedIds: string[];
} {
  const recognizedIds: string[] = [];
  const unrecognizedIds: string[] = [];
  const allotment = emptyAllotment();

  for (const raw of pricingItemIds) {
    const id = raw.trim();
    if (!id) continue;
    const catalog = getPricingItem(id);
    const slice = AI_ALLOTMENTS_BY_PRICING_ID[id];
    if (!catalog || !slice) {
      unrecognizedIds.push(id);
      continue;
    }
    recognizedIds.push(id);
    allotment.tokens += slice.tokens;
    allotment.toolCalls += slice.toolCalls;
    allotment.audits += slice.audits;
    allotment.emailDispatches += slice.emailDispatches;
  }

  return { allotment, recognizedIds, unrecognizedIds };
}

/**
 * Suggested max automated audits per UTC day for a client, derived from their
 * monthly subscription audit allotment (spread across ~22 business days).
 * Does not change pricing — only paces tool usage to the tier.
 */
export function resolveClientDailyAuditPace(monthlyAuditBudget: number) {
  const budget = Math.max(0, Math.floor(monthlyAuditBudget));
  if (budget <= 0) return 0;
  return Math.max(1, Math.ceil(budget / 22));
}

/** Heuristic token estimates for pre-flight budget checks. */
export const HEAVY_TOOL_COST_ESTIMATES: Record<
  string,
  { tokens: number; toolCalls: number; audits?: number; emails?: number }
> = {
  runWebsiteAudit: { tokens: 0, toolCalls: 1, audits: 1 },
  runVisitorWebsiteAudit: { tokens: 800, toolCalls: 1, audits: 1 },
  generateCampaignWorkflow: { tokens: 2800, toolCalls: 1 },
  dispatchDigisolEmail: { tokens: 0, toolCalls: 1, emails: 1 },
  dispatchEmailCampaign: { tokens: 0, toolCalls: 1, emails: 1 },
  dispatchAutomatedEmail: { tokens: 0, toolCalls: 1, emails: 1 },
  dispatchSocialCampaign: { tokens: 900, toolCalls: 1 },
  agent_orchestration: { tokens: 1800, toolCalls: 1 },
  agent_light: { tokens: 700, toolCalls: 1 },
};

export function estimateToolCost(
  toolName: string,
  extras?: { emails?: number; tokens?: number },
) {
  const base = HEAVY_TOOL_COST_ESTIMATES[toolName] || {
    tokens: 400,
    toolCalls: 1,
  };
  return {
    tokens: extras?.tokens ?? base.tokens,
    toolCalls: base.toolCalls,
    audits: base.audits ?? 0,
    emails: extras?.emails ?? base.emails ?? 0,
  };
}
