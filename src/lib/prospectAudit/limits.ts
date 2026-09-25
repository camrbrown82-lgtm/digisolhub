/**
 * DigiSol local prospect-audit worker limits.
 *
 * Cron: 5 audits/day by default.
 * Hub "Run now": manual — can run anytime (does not wait on the cron quota).
 * DIGISOL_ENFORCE_BUDGETS=1 still applies DigiSol house hard caps when set.
 */

import {
  digisolBudgetsEnforced,
  DIGISOL_DAILY_AUTOMATED_AUDIT_CAP,
} from "@/lib/agent/budget/digisolDaily";

/** Scheduled cron daily ceiling (UTC day). */
export const PROSPECT_AUDIT_CRON_DAILY_MAX = 5;

/** Hub / Kaylev manual run — batch ceiling when not enforcing house budgets. */
export const PROSPECT_AUDIT_MANUAL_BATCH_MAX = 25;

/** Absolute daily ceiling when DIGISOL_ENFORCE_BUDGETS=1. */
export const PROSPECT_AUDIT_DAILY_MAX = DIGISOL_DAILY_AUTOMATED_AUDIT_CAP;

/** Default batch size per cron tick. */
export const PROSPECT_AUDIT_BATCH_DEFAULT = PROSPECT_AUDIT_CRON_DAILY_MAX;

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

/**
 * Preferred trades first. Worker expands to any pending sector when the
 * preferred queues are empty.
 */
export const DEFAULT_PROSPECT_TRADES = [
  "hvac",
  "electrical",
  "plumbing",
  "general",
  "construction",
  "landscaping",
  "cleaning",
  "auto",
  "dental",
  "legal",
  "accounting",
  "restaurant",
  "retail",
  "salon",
  "fitness",
  "realestate",
  "photography",
  "healthcare",
  "professional",
] as const;

export type ProspectTrade =
  | (typeof DEFAULT_PROSPECT_TRADES)[number]
  | (string & {});

export function resolveProspectDailyMax(
  requested?: number,
  opts?: { manual?: boolean },
) {
  const hard = digisolBudgetsEnforced()
    ? DIGISOL_DAILY_AUTOMATED_AUDIT_CAP
    : opts?.manual
      ? PROSPECT_AUDIT_MANUAL_BATCH_MAX
      : PROSPECT_AUDIT_CRON_DAILY_MAX;
  let cap = hard;
  if (typeof requested === "number" && Number.isFinite(requested) && requested > 0) {
    cap = Math.min(cap, Math.floor(requested));
  }
  return Math.max(0, cap);
}

export function resolveProspectBatchSize(
  remainingDaily: number,
  requested?: number,
  opts?: { manual?: boolean },
) {
  const preferred =
    typeof requested === "number" && Number.isFinite(requested) && requested > 0
      ? Math.floor(requested)
      : opts?.manual
        ? Math.min(10, PROSPECT_AUDIT_MANUAL_BATCH_MAX)
        : PROSPECT_AUDIT_BATCH_DEFAULT;
  const hard = digisolBudgetsEnforced()
    ? DIGISOL_DAILY_AUTOMATED_AUDIT_CAP
    : opts?.manual
      ? PROSPECT_AUDIT_MANUAL_BATCH_MAX
      : PROSPECT_AUDIT_CRON_DAILY_MAX;
  return Math.max(0, Math.min(preferred, remainingDaily, hard));
}

export function utcDayStartIso(now = new Date()) {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  ).toISOString();
}
