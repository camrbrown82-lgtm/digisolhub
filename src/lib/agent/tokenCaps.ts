import type { AgentComplexity, AgentTaskKind } from "@/lib/agent/types";

/**
 * Strict completion token caps. Keep these tight — callers can only go lower,
 * never higher than the hard ceiling.
 */
const TASK_MAX_TOKENS: Record<AgentTaskKind, number> = {
  email_draft: 700,
  email_flare: 700,
  campaign_strategy: 1800,
  site_workflow: 1600,
  general: 900,
};

const COMPLEXITY_CEILING: Record<AgentComplexity, number> = {
  lightweight: 900,
  complex: 2000,
};

/** Absolute hard ceiling regardless of task / override. */
export const AGENT_HARD_MAX_TOKENS = 2500;

/** Max tool-calling rounds per request (each round = another billed completion). */
export const AGENT_HARD_MAX_TOOL_ROUNDS = 6;

export function resolveMaxTokens(
  task: AgentTaskKind,
  complexity: AgentComplexity,
  requested?: number,
): number {
  const byTask = TASK_MAX_TOKENS[task];
  const byComplexity = COMPLEXITY_CEILING[complexity];
  let cap = Math.min(byTask, byComplexity, AGENT_HARD_MAX_TOKENS);

  if (typeof requested === "number" && Number.isFinite(requested) && requested > 0) {
    cap = Math.min(cap, Math.floor(requested));
  }

  return Math.max(64, cap);
}

export function resolveMaxToolRounds(requested?: number): number {
  const n =
    typeof requested === "number" && Number.isFinite(requested)
      ? Math.floor(requested)
      : AGENT_HARD_MAX_TOOL_ROUNDS;
  return Math.min(AGENT_HARD_MAX_TOOL_ROUNDS, Math.max(0, n));
}
