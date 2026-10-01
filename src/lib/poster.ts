import type OpenAI from "openai";
import {
  type CompanyBrand,
  brandColorLock,
  brandImagePrompt,
  brandKitPrompt,
  enforceVisualBrandLock,
  inferVisualStyle,
  isDarkBrand,
  posterLook,
  sanitizeVisualNotes,
} from "@/lib/branding";
import { jsonSafeText } from "@/lib/jsonSafe";
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
  },
) {
  const slide = input.slide;
  const slideCount = input.slideCount || 1;
  const site = input.siteUrl?.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const job = slide?.freeform
    ? [
        "OWNER'S BRIEF (instructions, not poster copy; never print these sentences):",
        input.brief.trim(),
        "Write the poster copy yourself in the brand voice, then typeset exactly that copy:",
        "- one headline of at most 7 words",
        "- one supporting line of at most 14 words",
        `- one button${site ? ` whose label or the line under it is exactly "${site}"` : ""}`,
        "Use only facts from the brief, the brand kit, and the facts below. No invented stats or claims.",
        input.badgeFacts ? `Facts: ${input.badgeFacts}` : "",
      ]
        .filter(Boolean)
        .join("\n")
    : slide
      ? [
          `Slide ${slide.index} of ${slideCount} — ${slide.label}`,
          slide.visualIdea ? `Requested layout: ${slide.visualIdea}` : "",
          "MUST PRINT THIS COPY EXACTLY, spelled as written:",
          mustPrintBlock(slide),
          input.context ? `Series notes: ${input.context}` : "",
          input.siteUrl ? `Canonical site URL if a button is needed: ${input.siteUrl}` : "",
          input.badgeFacts ? `Facts: ${input.badgeFacts}` : "",
        ]
          .filter(Boolean)
          .join("\n")
      : input.brief;
  const badgeRule = input.badgeFacts
    ? "\n- Do not draw any badge, seal, medal, laurel, rosette, certificate, or award emblem. The official award badge is added on its own band under the artwork after generation. The copy may name the award."
    : "";
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

${
  slide?.freeform
    ? "The owner gave instructions, not copy. Write short, specific copy in the brand voice, then write the full image prompt around it: layout, hierarchy, lighting, and where each line sits, with the exact copy in quotes. The prompt must describe the whole poster, not just list the copy."
    : "You are a typesetter, not a copywriter.\n- Every MUST PRINT line must appear in the image, spelled exactly. Do not paraphrase, shorten, merge, or swap in a brand tagline."
}
- If the visual idea conflicts with the copy, keep ALL required text readable and adapt the layout.
- Do not invent extra slogans, stats, phone numbers, cities, or URLs.
${brandColorLock(input.brand)}
${posterLook(input.companyName, input.brand)}
- Describe that look in the prompt: the lighting, glow, gradients, and texture, not just the copy.
- ${isDarkBrand(input.brand) ? "DARK MODE poster. The page is the background hex, not a white newsletter or paper mock." : "LIGHT MODE poster. Keep the page on the background hex."}
- Large high-contrast type in the text color. Highlights for glow, rules, buttons, and the key headline words.
- Fill the whole canvas with the layout. Do not leave a logo hole and do not draw a logo — a separate brand bar is added after generation so the mark never covers copy.
- Closing slides: a solid highlight-colored button shape containing the exact URL from the copy.
- Carousel slides must match each other: same background, same margins, same type style.
- This is a social poster or carousel slide, never a business card, contact card, or name-and-title card.
- No photos of real people, no QR codes, no watermarks, no unreadably small type.
- The only website address allowed is the one given in the job. Never write any other domain.${badgeRule}`,
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
    const written = jsonSafeText(completion.choices[0]?.message?.content?.trim() || "");
    return enforceVisualBrandLock(`${badgeRule.trim()}\n\n${written || fallback}`, input.companyName, input.brand);
  } catch {
    return enforceVisualBrandLock(`${badgeRule.trim()}\n\n${fallback}`, input.companyName, input.brand);
  }
}
