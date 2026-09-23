import { createOpenAI } from "@ai-sdk/openai";
import { getOpenAIApiKey } from "@/lib/openai";

export type DigisolModelTier = "light" | "orchestration";

const LIGHT_HINTS =
  /\b(draft|rewrite|subject|polish|short copy|summarize|tagline|one[- ]liner|edit|tone)\b/i;

const ORCHESTRATION_HINTS =
  /\b(campaign|orchestrat|multi[- ]?step|nurture|funnel|segment|a\/b|workflow|automate|analytics|audit|seo|conversion|sequence|drip|dispatch|blast|cold call)\b/i;

/**
 * Cost-aware DigiSol model router.
 * - light → gpt-4o-mini (drafting, summaries, light edits)
 * - orchestration → gpt-4o (multi-step campaign / tool loops)
 */
export function resolveDigisolModelTier(
  prompt: string,
  explicit?: DigisolModelTier | null,
): DigisolModelTier {
  if (explicit === "light" || explicit === "orchestration") return explicit;
  if (ORCHESTRATION_HINTS.test(prompt)) return "orchestration";
  if (LIGHT_HINTS.test(prompt)) return "light";
  // Default conservative: use mini unless the ask clearly needs tools / campaigns.
  return "light";
}

export function digisolModelId(tier: DigisolModelTier): string {
  if (tier === "orchestration") {
    return process.env.OPENAI_AGENT_COMPLEX_MODEL?.trim() || "gpt-4o";
  }
  return process.env.OPENAI_AGENT_LIGHT_MODEL?.trim() || "gpt-4o-mini";
}

export function createDigisolLanguageModel(tier: DigisolModelTier) {
  const apiKey = getOpenAIApiKey();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  const openai = createOpenAI({ apiKey });
  return openai(digisolModelId(tier));
}

export function describeDigisolModelRoute(tier: DigisolModelTier) {
  return {
    tier,
    model: digisolModelId(tier),
  };
}
