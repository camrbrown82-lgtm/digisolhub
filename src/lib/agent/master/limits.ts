/**
 * Master Agent cost controls.
 * Decision loop uses gpt-4o; lightweight helper synthesis uses gpt-4o-mini.
 */
export const MASTER_DECISION_MODEL =
  process.env.OPENAI_AGENT_COMPLEX_MODEL?.trim() || "gpt-4o";

export const MASTER_HELPER_MODEL =
  process.env.OPENAI_AGENT_LIGHT_MODEL?.trim() || "gpt-4o-mini";

/** Completion tokens for the governing decision loop (tool-calling). */
export const MASTER_DECISION_MAX_TOKENS = 1800;

/** Completion tokens for final synthesis / light helper text. */
export const MASTER_HELPER_MAX_TOKENS = 700;

/** Absolute ceiling — never exceed regardless of caller hint. */
export const MASTER_HARD_MAX_TOKENS = 2200;

/** Max tool-calling rounds (each round is another billed completion). */
export const MASTER_HARD_MAX_TOOL_ROUNDS = 6;

export function clampMasterMaxTokens(requested?: number, helper = false) {
  const base = helper ? MASTER_HELPER_MAX_TOKENS : MASTER_DECISION_MAX_TOKENS;
  let cap = Math.min(base, MASTER_HARD_MAX_TOKENS);
  if (typeof requested === "number" && Number.isFinite(requested) && requested > 0) {
    cap = Math.min(cap, Math.floor(requested));
  }
  return Math.max(64, cap);
}

export function clampMasterToolRounds(requested?: number) {
  const n =
    typeof requested === "number" && Number.isFinite(requested)
      ? Math.floor(requested)
      : MASTER_HARD_MAX_TOOL_ROUNDS;
  return Math.min(MASTER_HARD_MAX_TOOL_ROUNDS, Math.max(0, n));
}
