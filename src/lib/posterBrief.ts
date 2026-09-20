import {
  DIGISOL_CITY,
  DIGISOL_FOUNDER,
  DIGISOL_FOUNDER_TITLE,
  DIGISOL_SITE_URL,
} from "@/lib/site";

export const MAX_POSTER_SLIDES = 5;

export type PosterSlideRole = "hook" | "message" | "cta" | "slide";

export type PosterSlide = {
  index: number;
  label: string;
  role: PosterSlideRole;
  visualIdea: string;
  headline: string;
  subhead: string;
  body: string;
  mustPrint: string[];
};

const SLIDE_SPLIT =
  /(?=\[\s*SLIDE\s*\d+|\n\s*SLIDE\s*\d+\s*[:./-])/i;

export function sanitizePosterCopy(value: string) {
  return value
    .replace(/https?:\/\/(?:www\.)?wwwdigisol\.com/gi, DIGISOL_SITE_URL)
    .replace(/\bwww\.wwwdigisol\.com\b/gi, "wwwdigisol.com")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function takeField(block: string, names: string[]) {
  const label = names.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const pattern = new RegExp(
    `(?:^|\\n)\\s*(?:${label})\\s*:\\s*\\n?([\\s\\S]*?)(?=\\n\\s*(?:Visual Idea|Headline|Sub-headline|Subhead|Sub headline|Body Copy|Body|Text|CTA|Button)\\s*:|$)`,
    "i",
  );
  const match = block.match(pattern);
  return sanitizePosterCopy(match?.[1] || "");
}

function roleFromLabel(label: string): PosterSlideRole {
  if (/hook|header|cover/i.test(label)) return "hook";
  if (/cta|call to action|closing|footer/i.test(label)) return "cta";
  if (/core|message|body|comparison/i.test(label)) return "message";
  return "slide";
}

function linesFrom(text: string) {
  return text
    .split(/\n+/)
    .map((line) => line.replace(/^[-*•👉]\s*/, "").trim())
    .filter(Boolean)
    .filter((line) => !/^(visual idea|headline|sub-headline|body copy|text)\s*:?$/i.test(line));
}

export function parsePosterSlides(brief: string): {
  context: string;
  slides: PosterSlide[];
} {
  const cleaned = sanitizePosterCopy(brief);
  const chunks = cleaned.split(SLIDE_SPLIT).map((chunk) => chunk.trim()).filter(Boolean);
  const slides: PosterSlide[] = [];
  let context = "";

  for (const chunk of chunks) {
    const header = chunk.match(/^\[?\s*SLIDE\s*(\d+)\s*(?:\/\s*([^\]]+))?\]?/i);
    if (!header) {
      if (!context) context = chunk;
      continue;
    }
    const body = chunk.slice(header[0].length).trim();
    const label = sanitizePosterCopy(header[2] || `Slide ${header[1]}`);
    const visualIdea = takeField(body, ["Visual Idea"]);
    const headline = takeField(body, ["Headline", "Title"]);
    const subhead = takeField(body, ["Sub-headline", "Subhead", "Sub headline"]);
    const copy = takeField(body, ["Body Copy", "Body", "Text", "CTA"]);
    const leftover = sanitizePosterCopy(
      body
        .replace(/visual idea\s*:[\s\S]*?(?=\n\s*(?:headline|sub-headline|subhead|body copy|text|cta)\s*:|$)/i, "")
        .replace(/(?:headline|sub-headline|subhead|body copy|body|text|cta)\s*:/gi, "\n"),
    );
    const bodyText = copy || (!headline && !subhead ? leftover : "");
    const mustPrint = [
      ...linesFrom(headline),
      ...linesFrom(subhead),
      ...linesFrom(bodyText),
    ].filter((line, index, list) => list.findIndex((item) => item.toLowerCase() === line.toLowerCase()) === index);

    slides.push({
      index: Number(header[1]) || slides.length + 1,
      label,
      role: roleFromLabel(label),
      visualIdea,
      headline,
      subhead,
      body: bodyText,
      mustPrint: mustPrint.length ? mustPrint : linesFrom(leftover).slice(0, 12),
    });
  }

  if (!slides.length) {
    const headline = takeField(cleaned, ["Headline", "Title"]);
    const subhead = takeField(cleaned, ["Sub-headline", "Subhead"]);
    const body = takeField(cleaned, ["Body Copy", "Body", "Text"]) || cleaned;
    const mustPrint = [
      ...linesFrom(headline),
      ...linesFrom(subhead),
      ...linesFrom(headline || subhead ? body : cleaned),
    ].slice(0, 16);
    slides.push({
      index: 1,
      label: "Poster",
      role: "slide",
      visualIdea: takeField(cleaned, ["Visual Idea"]),
      headline,
      subhead,
      body,
      mustPrint: mustPrint.length ? mustPrint : [cleaned.slice(0, 280)],
    });
  }

  return {
    context: context.slice(0, 800),
    slides: slides.slice(0, MAX_POSTER_SLIDES).map((slide, index) => ({
      ...slide,
      index: index + 1,
    })),
  };
}

export function withHouseCtaDetails(slide: PosterSlide, companyName: string, siteUrl: string) {
  if (slide.role !== "cta") return slide;
  const house = companyName.toLowerCase() === "digisol";
  const extras: string[] = [];
  const blob = `${slide.body}\n${slide.mustPrint.join("\n")}`.toLowerCase();
  if (house && !blob.includes("cameron")) {
    extras.push(`${DIGISOL_FOUNDER}, ${DIGISOL_FOUNDER_TITLE}`);
  }
  if (house && !blob.includes("airdrie")) {
    extras.push(`${DIGISOL_CITY}, AB`);
  }
  if (!/wwwdigisol\.com|https?:\/\//i.test(blob)) {
    extras.push(siteUrl || DIGISOL_SITE_URL);
  }
  if (!extras.length) return slide;
  return {
    ...slide,
    mustPrint: [...slide.mustPrint, ...extras],
    body: [slide.body, ...extras].filter(Boolean).join("\n"),
  };
}

export function mustPrintBlock(slide: PosterSlide) {
  const lines = slide.mustPrint.length
    ? slide.mustPrint
    : [slide.headline, slide.subhead, slide.body].filter(Boolean);
  return lines.map((line, index) => `${index + 1}. "${line}"`).join("\n");
}

export function shortPosterCaption(slides: PosterSlide[]) {
  const first = slides[0];
  if (!first) return "";
  return [first.headline, first.subhead].filter(Boolean).join("\n") || first.mustPrint[0] || "";
}
