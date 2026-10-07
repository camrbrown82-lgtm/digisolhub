import type OpenAI from "openai";
import { type CompanyBrand } from "@/lib/branding";
import { jsonSafeText } from "@/lib/jsonSafe";
import { shouldFallbackImageModel } from "@/lib/openai";
import { type PosterSlide } from "@/lib/posterBrief";

export const POSTER_FORMATS = ["portrait", "square", "landscape"] as const;
export type PosterFormat = (typeof POSTER_FORMATS)[number];

export function parsePosterFormat(value: unknown): PosterFormat {
  return POSTER_FORMATS.includes(value as PosterFormat)
    ? (value as PosterFormat)
    : "portrait";
}

export function resolveImageModel(raw?: string) {
  const model = raw?.trim() || "dall-e-3";
  if (/^dall-e-2$/i.test(model)) return "dall-e-2";
  if (/^dall-e/i.test(model)) return "dall-e-3";
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
  model: string | undefined,
  prompt: string,
  format: PosterFormat,
) {
  const resolved = resolveImageModel(model);
  const clean = jsonSafeText(prompt).slice(0, 3900);
  if (isGptImage(resolved)) {
    return {
      model: resolved,
      prompt: clean,
      size: posterSize(resolved, format),
      quality: "high" as const,
    };
  }
  return {
    model: resolved,
    prompt: clean,
    size: posterSize(resolved, format),
    quality: "hd" as const,
    style: "vivid" as const,
  };
}

export function imageEditBody(
  model: string | undefined,
  prompt: string,
  format: PosterFormat,
  image: File,
) {
  const resolved = resolveImageModel(model);
  if (isGptImage(resolved)) {
    return {
      model: resolved,
      prompt,
      image,
      size: posterSize(resolved, format),
      quality: "high" as const,
      input_fidelity: "high" as const,
    };
  }
  return {
    model: resolved,
    prompt,
    image,
    size: posterSize(resolved, "square"),
  };
}

/** The picture request, sent straight to the image API. Colors come from the company kit. Words and marks are added later. */
export function directScenePrompt(
  request: string,
  brand?: { backgroundColor?: string; primaryColor?: string; highlightColor?: string },
) {
  const ask = request.replace(/\s+/g, " ").trim().slice(0, 1800);
  const background = brand?.backgroundColor || "#09090b";
  const primary = brand?.primaryColor || "#4f46e5";
  const highlight = brand?.highlightColor || "#60a5fa";
  return [
    "Create a brand-new picture. Do not copy an older poster, business card, or award layout.",
    `Palette only: near-black ${background}, indigo purple ${primary}, electric blue ${highlight}. Not orange, cream, yellow, or pastel.`,
    `Draw this: ${ask || "open space, with the top, center, and bottom left clear."}`,
    "No letters, words, numbers, logos, badges, awards, buttons, or QR codes.",
  ].join("\n");
}

export async function generateSceneBuffer(
  openai: OpenAI,
  prompt: string,
  format: PosterFormat,
  preferred?: string,
) {
  let image;
  try {
    image = await openai.images.generate(imageGenerateBody(preferred, prompt, format));
  } catch (err) {
    if (!shouldFallbackImageModel(err)) throw err;
    image = await openai.images.generate(imageGenerateBody("dall-e-3", jsonSafeText(prompt).slice(0, 2500), format));
  }
  const first = image.data?.[0];
  if (first?.b64_json) return Buffer.from(first.b64_json, "base64");
  if (first?.url) {
    const downloaded = await fetch(first.url);
    if (downloaded.ok) return Buffer.from(await downloaded.arrayBuffer());
  }
  return null;
}

export async function writePosterArtDirection(
  openai: OpenAI,
  input: {
    companyName: string;
    brand: CompanyBrand;
    brief: string;
    format: PosterFormat;
    slide?: PosterSlide;
    slideCount?: number;
    context?: string;
    siteUrl?: string;
    /** An official badge is added under the art after generation. */
    badgeFacts?: string;
    /** This company's published pages. Never another company's offer. */
    publishedFacts?: string;
  },
) {
  void openai;
  const scene = input.slide?.visualIdea?.trim() || "Open space. Leave the top, center, and bottom clear.";
  return directScenePrompt(scene, {
    backgroundColor: input.brand.backgroundColor,
    primaryColor: input.brand.primaryColor,
    highlightColor: input.brand.highlightColor,
  });
}

/** Words that will be typeset on the artwork, so they stay editable. */
export async function posterEditableLines(
  openai: OpenAI,
  slide: PosterSlide | undefined,
  companyName: string,
  voice: string,
) {
  const printed = (slide?.mustPrint || [])
    .map((line) => cleanPosterLine(line))
    .filter((line) => line.length > 0 && line.length <= 180);
  if (slide?.freeform) {
    const offered = printed.filter((line) => !isPosterStageDirection(line)).slice(0, 8);
    if (offered.length) return offered;
  }
  if (slide && !slide.freeform) return printed.filter((line) => !isPosterStageDirection(line)).slice(0, 8);
  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_EMAIL_MODEL || "gpt-4o-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Return JSON {\"lines\":[\"...\"]} with the headline and offers that belong on the poster. Drop stage directions, labels like Sub Headlines, and anything in parentheses that says what to draw. Do not add the brand tagline. No hashtags, no invented stats.",
        },
        {
          role: "user",
          content: `Company: ${companyName}\nVoice: ${voice || "clear"}\nBrief:\n${(slide?.body || printed.join("\n")).slice(0, 1200)}`,
        },
      ],
    });
    const parsed = JSON.parse(completion.choices[0]?.message?.content || "{}") as { lines?: unknown };
    const lines = Array.isArray(parsed.lines)
      ? parsed.lines.filter((line): line is string => typeof line === "string")
      : [];
    const clean = lines.map((line) => cleanPosterLine(line)).filter((line) => line.length > 0 && line.length <= 180);
    if (clean.length) return clean.filter((line) => !isPosterStageDirection(line)).slice(0, 8);
  } catch {
    /* fall through */
  }
  return printed.filter((line) => !isPosterStageDirection(line)).slice(0, 8);
}

function cleanPosterLine(line: string) {
  return line
    .replace(/\(([^)]*)\)/g, (full, inner: string) =>
      /\b(add|include|draw|graphic|image|rocket|photo|picture|icon|visual)\b/i.test(String(inner)) ? " " : full,
    )
    .replace(/\s+/g, " ")
    .trim();
}

function isPosterStageDirection(line: string) {
  const text = line.trim();
  if (!text) return true;
  if (/^(sub\s*headlines?|headlines?|visual idea|body copy|body|text)\s*:?\s*$/i.test(text)) return true;
  if (/^\(.*\)$/.test(text)) return true;
  if (/\b(add|draw|include)\b.+\b(graphic|image|rocket|picture|photo)\b/i.test(text) && text.length < 80) return true;
  return false;
}
