import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { DEFAULT_LOCALE, LOCALE_META, type Locale } from "@/lib/i18n/config";
import { getOpenAIApiKey } from "@/lib/openai";

/**
 * Translates short plain-text lines (audit findings, summaries) for an email.
 * Returns the originals when the language is English, OpenAI is missing, or the reply is unusable.
 */
export async function translateLines(lines: string[], locale: Locale): Promise<string[]> {
  const apiKey = getOpenAIApiKey();
  if (locale === DEFAULT_LOCALE || !apiKey || lines.length === 0) return lines;
  try {
    const openai = createOpenAI({ apiKey });
    const result = await generateText({
      model: openai(process.env.OPENAI_AGENT_LIGHT_MODEL?.trim() || "gpt-4o-mini"),
      temperature: 0.2,
      maxOutputTokens: 900,
      prompt: `Translate each string into ${LOCALE_META[locale].label} (${LOCALE_META[locale].intl}).${
        locale === "fr" ? ' Use Canadian French: "vous", and "courriel" for email.' : ""
      }
Keep URLs, numbers, brand names (DigiSol, Kaylev, Google, Next.js) and technical terms like SEO, CTA, HTTPS and TTFB unchanged.
Reply with only a JSON array of strings, same order and same length as the input.

${JSON.stringify(lines)}`,
    });
    const match = result.text.match(/\[[\s\S]*\]/);
    const parsed = match ? (JSON.parse(match[0]) as unknown) : null;
    if (
      Array.isArray(parsed) &&
      parsed.length === lines.length &&
      parsed.every((item) => typeof item === "string" && item.trim())
    ) {
      return parsed as string[];
    }
  } catch (error) {
    console.warn("[translateLines]", error instanceof Error ? error.message : error);
  }
  return lines;
}
