import type { AgentComplexity, AgentTaskKind } from "@/lib/agent/types";

const LIGHTWEIGHT_TASKS = new Set<AgentTaskKind>([
  "email_draft",
  "email_flare",
]);

const COMPLEX_TASKS = new Set<AgentTaskKind>([
  "campaign_strategy",
  "site_workflow",
]);

const COMPLEX_HINTS =
  /\b(campaign|strategy|multi[- ]?step|nurture|funnel|segmentation|a\/b|workflow|automate|roadmap|sequence|drip|analytics|audit|seo|conversion|drop[- ]?off)\b/i;

const LIGHT_HINTS =
  /\b(email|draft|rewrite|subject|flare|polish|short copy|one[- ]pager)\b/i;

/**
 * Resolve task kind from an explicit value or prompt heuristics.
 * Defaults to "general" when unclear so the complexity router can decide.
 */
export function resolveAgentTask(
  task: AgentTaskKind | undefined,
  prompt: string,
): AgentTaskKind {
  if (task) return task;
  if (COMPLEX_HINTS.test(prompt)) return "campaign_strategy";
  if (LIGHT_HINTS.test(prompt)) return "email_draft";
  return "general";
}

export function resolveComplexity(task: AgentTaskKind, prompt: string): AgentComplexity {
  if (LIGHTWEIGHT_TASKS.has(task)) return "lightweight";
  if (COMPLEX_TASKS.has(task)) return "complex";
  // general: prefer cheap unless the prompt clearly needs multi-step reasoning
  return COMPLEX_HINTS.test(prompt) ? "complex" : "lightweight";
}

/**
 * Cost-aware model router.
 * Lightweight drafting → gpt-4o-mini; multi-step strategy → gpt-4o.
 * Env overrides keep ops flexible without code changes.
 */
export function routeAgentModel(complexity: AgentComplexity): string {
  if (complexity === "complex") {
    return process.env.OPENAI_AGENT_COMPLEX_MODEL?.trim() || "gpt-4o";
  }
  return process.env.OPENAI_AGENT_LIGHT_MODEL?.trim() || "gpt-4o-mini";
}

export function describeModelRoute(task: AgentTaskKind, complexity: AgentComplexity) {
  return {
    task,
    complexity,
    model: routeAgentModel(complexity),
  };
}
