/**
 * DigiSol local prospect-audit worker limits.
 * Daily ceiling follows DigiSol house budget mode (unrestricted by default).
 */

import {
  digisolBudgetsEnforced,
  DIGISOL_DAILY_AUTOMATED_AUDIT_CAP,
} from "@/lib/agent/budget/digisolDaily";

/** Absolute daily ceiling when budgets are enforced. */
export const PROSPECT_AUDIT_DAILY_MAX = DIGISOL_DAILY_AUTOMATED_AUDIT_CAP;

/** Default batch size per cron tick. */
export const PROSPECT_AUDIT_BATCH_DEFAULT = digisolBudgetsEnforced() ? 5 : 25;

/** Only gpt-4o-mini for background scraping / summary work. */
export const PROSPECT_AUDIT_MODEL =
  process.env.OPENAI_PROSPECT_AUDIT_MODEL?.trim() || "gpt-4o-mini";

/**
 * Completion cap per audit summary.
 * Raised for growth phase so summaries aren't truncated mid-thought.
 */
export const PROSPECT_AUDIT_MAX_OUTPUT_TOKENS = digisolBudgetsEnforced()
  ? 280
  : 600;

/** Truncate scraped page text before sending to the model. */
export const PROSPECT_AUDIT_MAX_PAGE_CHARS = digisolBudgetsEnforced()
  ? 2800
  : 6000;

export const DEFAULT_PROSPECT_TRADES = [
  "hvac",
  "electrical",
  "plumbing",
  "general",
] as const;

export type ProspectTrade = (typeof DEFAULT_PROSPECT_TRADES)[number] | (string & {});

export function resolveProspectDailyMax(requested?: number) {
  const hard = DIGISOL_DAILY_AUTOMATED_AUDIT_CAP;
  let cap = hard;
  if (typeof requested === "number" && Number.isFinite(requested) && requested > 0) {
    cap = Math.min(cap, Math.floor(requested));
  }
  return Math.max(0, cap);
}

export function resolveProspectBatchSize(
  remainingDaily: number,
  requested?: number,
) {
  const preferred =
    typeof requested === "number" && Number.isFinite(requested) && requested > 0
      ? Math.floor(requested)
      : PROSPECT_AUDIT_BATCH_DEFAULT;
  return Math.max(
    0,
    Math.min(preferred, remainingDaily, DIGISOL_DAILY_AUTOMATED_AUDIT_CAP),
  );
}

export function utcDayStartIso(now = new Date()) {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  ).toISOString();
}
