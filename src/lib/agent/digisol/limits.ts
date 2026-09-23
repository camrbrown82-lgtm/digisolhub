import type { DigisolModelTier } from "@/lib/agent/digisol/model";

/** Per-completion output caps. Callers may only go lower. */
const TIER_MAX_OUTPUT_TOKENS: Record<DigisolModelTier, number> = {
  light: 2500,
  orchestration: 8000,
};

/** Absolute hard ceiling — never exceed regardless of request. */
export const DIGISOL_HARD_MAX_OUTPUT_TOKENS = 12_000;

/**
 * Max streamText / tool-loop steps (each step ≈ another billed completion).
 */
export const DIGISOL_HARD_MAX_STEPS = 16;

export function resolveDigisolMaxOutputTokens(
  tier: DigisolModelTier,
  requested?: number,
): number {
  let cap = Math.min(TIER_MAX_OUTPUT_TOKENS[tier], DIGISOL_HARD_MAX_OUTPUT_TOKENS);
  if (typeof requested === "number" && Number.isFinite(requested) && requested > 0) {
    cap = Math.min(cap, Math.floor(requested));
  }
  return Math.max(64, cap);
}

export function resolveDigisolMaxSteps(requested?: number): number {
  const n =
    typeof requested === "number" && Number.isFinite(requested)
      ? Math.floor(requested)
      : DIGISOL_HARD_MAX_STEPS;
  return Math.min(DIGISOL_HARD_MAX_STEPS, Math.max(1, n));
}
