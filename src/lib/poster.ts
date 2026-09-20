import type OpenAI from "openai";
import {
  type CompanyBrand,
  brandImagePrompt,
  brandKitPrompt,
  enforceVisualBrandLock,
  inferVisualStyle,
  sanitizeVisualNotes,
} from "@/lib/branding";
import { type PosterSlide, mustPrintBlock } from "@/lib/posterBrief";

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
  },
) {
  const slide = input.slide;
  const slideCount = input.slideCount || 1;
  const job = slide
    ? [
        `Slide ${slide.index} of ${slideCount} — ${slide.label}`,
        slide.visualIdea ? `Requested layout: ${slide.visualIdea}` : "",
        "MUST PRINT THIS COPY EXACTLY, spelled as written:",
        mustPrintBlock(slide),
        input.context ? `Series notes: ${input.context}` : "",
        input.siteUrl ? `Canonical site URL if a button is needed: ${input.siteUrl}` : "",
      ]
        .filter(Boolean)
        .join("\n")
    : input.brief;
  const fallback = brandImagePrompt(
    input.companyName,
    input.brand,
    job,
    input.format,
  );

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_EMAIL_MODEL || "gpt-4o-mini",
      temperature: 0.12,
      messages: [
        {
          role: "system",
          content: `You write one image-generation prompt for a single social-media infographic slide. Output the prompt only — no title, no markdown, no quotes around the whole prompt.

You are a typesetter, not a copywriter.
- Every MUST PRINT line must appear in the image, spelled exactly. Do not paraphrase, shorten, merge, or swap in a brand tagline.
- If the visual idea conflicts with the copy, keep ALL required text readable and adapt the layout.
- Do not invent extra slogans, stats, phone numbers, cities, or URLs.
- Use only the given brand hex colors. Background is the brand background.
- Premium dark infographic / carousel card. Thin accent glow is fine. No neon phone or device mockup unless the brief asks for a device.
- Large high-contrast type. Generous margins. Infographic hierarchy, not a single floating paragraph.
- Leave the top 20% empty in the background color for the official logo stamp. Do not draw a logo or a giant company wordmark.
- Closing slides: a solid brand-colored button shape containing the exact URL from the copy.
- Carousel slides must match each other: same background, same margins, same type style.
- No photos of real people, no QR codes, no watermarks, no unreadably small type.`,
        },
        {
          role: "user",
          content: `Format: ${input.format} ${slideCount > 1 ? "carousel slide" : "poster"}
${job}

${brandKitPrompt(input.companyName, input.brand, "visual")}
Art direction: ${inferVisualStyle(input.brand)}
Safe extra notes: ${sanitizeVisualNotes(input.brand.extra) || "(none)"}
Official logo is stamped after generation.`,
        },
      ],
    });
    const written = completion.choices[0]?.message?.content?.trim() || "";
    return enforceVisualBrandLock(written || fallback, input.companyName, input.brand);
  } catch {
    return enforceVisualBrandLock(fallback, input.companyName, input.brand);
  }
}
