/**
 * Hard cost controls for the DigiSol local prospect-audit worker.
 * Sized around exactly 5 audits/day on gpt-4o-mini (DigiSol bootstrap).
 */

import { DIGISOL_DAILY_AUTOMATED_AUDIT_CAP } from "@/lib/agent/budget/digisolDaily";

/** Absolute daily ceiling — never exceed. Locked to DigiSol bootstrap rule. */
export const PROSPECT_AUDIT_DAILY_MAX = DIGISOL_DAILY_AUTOMATED_AUDIT_CAP;

/** Default batch size per cron tick (capped by remaining daily budget). */
export const PROSPECT_AUDIT_BATCH_DEFAULT = 5;

/** Only gpt-4o-mini for background scraping / summary work. */
export const PROSPECT_AUDIT_MODEL =
  process.env.OPENAI_PROSPECT_AUDIT_MODEL?.trim() || "gpt-4o-mini";

/**
 * Strict completion cap per audit summary.
 * ~280 tokens × 5 audits ≈ 1.4k completion tokens/day.
 */
export const PROSPECT_AUDIT_MAX_OUTPUT_TOKENS = 280;

/** Truncate scraped page text before sending to the model. */
export const PROSPECT_AUDIT_MAX_PAGE_CHARS = 2800;

export const DEFAULT_PROSPECT_TRADES = [
  "hvac",
  "electrical",
  "plumbing",
  "general",
] as const;

export type ProspectTrade = (typeof DEFAULT_PROSPECT_TRADES)[number] | (string & {});

export function resolveProspectDailyMax(requested?: number) {
  // DigiSol bootstrap hard product rule: exactly 5 automated audits/day.
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
