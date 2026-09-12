import type OpenAI from "openai";
import {
  type CompanyBrand,
  brandImagePrompt,
  brandVoicePrompt,
  inferVisualStyle,
  sanitizeVisualNotes,
} from "@/lib/branding";

export const POSTER_FORMATS = ["portrait", "square", "landscape"] as const;
export type PosterFormat = (typeof POSTER_FORMATS)[number];

export function parsePosterFormat(value: unknown): PosterFormat {
  return POSTER_FORMATS.includes(value as PosterFormat)
    ? (value as PosterFormat)
    : "portrait";
}

export function resolveImageModel(raw?: string) {
  const model = raw?.trim() || "gpt-image-1";
  if (/^dall-e/i.test(model)) return "gpt-image-1";
  return model;
}

function isGptImage(model: string) {
  return /gpt-image|chatgpt-image/i.test(model);
}

export function posterSize(model: string, format: PosterFormat) {
  if (format === "square") return "1024x1024" as const;
  if (isGptImage(model)) {
    return format === "landscape" ? ("1536x1024" as const) : ("1024x1536" as const);
  }
  return format === "landscape" ? ("1792x1024" as const) : ("1024x1792" as const);
}

export function imageGenerateBody(
  model: string,
  prompt: string,
  format: PosterFormat,
) {
  const resolved = resolveImageModel(model);
  if (isGptImage(resolved)) {
    return {
      model: resolved,
      prompt,
      size: posterSize(resolved, format),
      quality: "high" as const,
    };
  }
  return {
    model: resolved,
    prompt,
    size: posterSize(resolved, format),
    quality: "hd" as const,
    style: "vivid" as const,
  };
}

export async function writePosterArtDirection(
  openai: OpenAI,
  input: {
    companyName: string;
    brand: CompanyBrand;
    brief: string;
    format: PosterFormat;
  },
) {
  const fallback = brandImagePrompt(
    input.companyName,
    input.brand,
    input.brief,
    input.format,
  );

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_EMAIL_MODEL || "gpt-4o-mini",
      temperature: 0.65,
      messages: [
        {
          role: "system",
          content: `You are a creative director at a high-end studio. Write one image-generation prompt for a print-quality marketing poster. Output the prompt only — no title, no markdown, no quotes.

Rules:
- Look like a paid campaign, not AI collage or generic stock.
- Translate brand voice into composition, lighting, materials, and type hierarchy.
- Use only the given hex colors as the dominant palette. Background must read as the brand background.
- If the company name appears, spell it exactly. No invented marks, no misspellings.
- One focal idea, generous negative space, tactile surfaces, realistic light.
- No real people, no contact details, no QR codes, no watermarks, no unreadably small type.`,
        },
        {
          role: "user",
          content: `Format: ${input.format} poster
Job: ${input.brief}

${brandVoicePrompt(input.companyName, input.brand)}
Art direction: ${inferVisualStyle(input.brand)}
Safe extra notes: ${sanitizeVisualNotes(input.brand.extra) || "(none)"}`,
        },
      ],
    });
    const written = completion.choices[0]?.message?.content?.trim() || "";
    return written.slice(0, 3900) || fallback;
  } catch {
    return fallback;
  }
}
