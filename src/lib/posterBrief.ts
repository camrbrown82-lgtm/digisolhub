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
  /** The brief is instructions ("a poster that…"), not copy, so the art director writes the copy. */
  freeform?: boolean;
  /** Real poster lines, in order. Field labels are not included. */
  copyLines?: { role: "headline" | "sub" | "award" | "button"; text: string }[];
  placeLogo?: boolean;
  placeEmblem?: boolean;
  placeAward?: boolean;
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

const STAGE_DIRECTION = /\b(add|include|draw|graphic|image|rocket|photo|picture|icon|visual)\b/i;

function posterLine(raw: string) {
  const visual: string[] = [];
  let text = raw.replace(/\(([^)]*)\)/g, (full, inner: string) => {
    if (STAGE_DIRECTION.test(String(inner))) {
      visual.push(String(inner).trim());
      return " ";
    }
    return full;
  });
  text = text.replace(/^(sub\s*headlines?|headlines?|visual idea|body copy|body|text)\s*:\s*/i, "").replace(/\s+/g, " ").trim();
  if (!text || /^(sub\s*headlines?|headlines?|visual idea|body copy|body|text)\s*:?\s*$/i.test(text)) {
    return { text: "", visual };
  }
  if (
    (/\b(draw|include|put)\b/i.test(text) || /\badd\b(?!\s*-?\s*on\b)/i.test(text)) &&
    /\b(graphic|image|rocket|picture|photo|icon)\b/i.test(text) &&
    text.length < 140
  ) {
    visual.push(text);
    return { text: "", visual };
  }
  if (/^(make|create|design|draw|i want|i need|please)\b/i.test(text) && text.length < 180) {
    visual.push(text);
    return { text: "", visual };
  }
  return { text, visual };
}

function designBrief(brief: string) {
  const visual: string[] = [];
  const lines: string[] = [];
  for (const raw of brief.split(/\n+/)) {
    const line = raw.trim();
    if (!line) continue;
    const next = posterLine(line);
    visual.push(...next.visual);
    if (next.text && next.text.length <= 180) lines.push(next.text);
  }
  return { visual: visual.join(". ").slice(0, 500), lines: lines.slice(0, 8) };
}

const FIELD_LABEL =
  /^(single page poster|visual idea|headlines?|titles?|sub[\s-]*head(?:line|lines)?|text above award|buttons?|cta|graphics|body copy|body|text)\s*[,;:]+\s*(.*)$/i;

function fieldSection(name: string) {
  const label = name.toLowerCase();
  if (/^single page poster$/.test(label)) return "skip";
  if (/visual/.test(label)) return "visual";
  if (/^head|^title/.test(label)) return "headline";
  if (/sub/.test(label)) return "sub";
  if (/text above award/.test(label)) return "award";
  if (/button|cta/.test(label)) return "button";
  if (/graphic/.test(label)) return "graphics";
  return "body";
}

/** A labeled brief (Headline; / Sub Headline; / Graphics;) becomes copy, a scene, and which real marks to place. */
export function parsePosterRequest(brief: string): {
  visualIdea: string;
  lines: { role: "headline" | "sub" | "award" | "button"; text: string }[];
  placeLogo: boolean;
  placeEmblem: boolean;
  placeAward: boolean;
} | null {
  const sections = new Map<string, string[]>();
  let current = "";
  let labels = 0;
  for (const raw of brief.split(/\n+/)) {
    const line = raw.trim();
    if (!line) continue;
    const match = line.match(FIELD_LABEL);
    if (match) {
      labels += 1;
      current = fieldSection(match[1]);
      const rest = match[2].trim();
      if (rest && current !== "skip") {
        const list = sections.get(current) || [];
        list.push(rest);
        sections.set(current, list);
      }
      continue;
    }
    if (!current || current === "skip") continue;
    const list = sections.get(current) || [];
    list.push(line);
    sections.set(current, list);
  }
  if (labels < 2) return null;

  const visual: string[] = [];
  const lines: { role: "headline" | "sub" | "award" | "button"; text: string }[] = [];
  for (const role of ["headline", "sub", "award", "button"] as const) {
    for (const raw of sections.get(role) || []) {
      const next = posterLine(raw);
      visual.push(...next.visual);
      if (!next.text || /[,;:]$/.test(next.text)) continue;
      if (role === "button" && !/^https?:\/\//i.test(next.text) && !/^www\./i.test(next.text)) continue;
      lines.push({ role, text: next.text });
    }
  }

  const graphics = sections.get("graphics") || [];
  const placeLogo = graphics.some((line) => /\blogo\b/i.test(line));
  const placeAward = graphics.some((line) => /\b(excellence award|award)\b/i.test(line));
  const placeEmblem = graphics.some((line) => /\bbadge\b/i.test(line) && !/\b(excellence award|website excellence)\b/i.test(line));
  const color = graphics.find((line) => /\b(indigo|purple|blue|color|page)\b/i.test(line)) || "";
  const rocket = visual.some((line) => /\brocket\b/i.test(line));
  const visualIdea = [
    rocket ? "One medium rocket on the right third, beside the headline area. Do not cover the center or the bottom." : "",
    color,
    "Leave the top, the center, and the bottom empty.",
  ]
    .filter(Boolean)
    .join(" ");

  return { visualIdea, lines, placeLogo, placeEmblem, placeAward };
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

    const printed = designBrief((mustPrint.length ? mustPrint : linesFrom(leftover).slice(0, 12)).join("\n"));
    slides.push({
      index: Number(header[1]) || slides.length + 1,
      label,
      role: roleFromLabel(label),
      visualIdea: [visualIdea, printed.visual].filter(Boolean).join(". "),
      headline,
      subhead,
      body: bodyText,
      mustPrint: printed.lines,
    });
  }

  if (!slides.length) {
    const request = parsePosterRequest(cleaned);
    if (request) {
      slides.push({
        index: 1,
        label: "Poster",
        role: "slide",
        visualIdea: request.visualIdea,
        headline: request.lines.find((line) => line.role === "headline")?.text || "",
        subhead: request.lines
          .filter((line) => line.role === "sub")
          .map((line) => line.text)
          .join("\n"),
        body: cleaned,
        mustPrint: request.lines.map((line) => line.text),
        freeform: true,
        copyLines: request.lines,
        placeLogo: request.placeLogo,
        placeEmblem: request.placeEmblem,
        placeAward: request.placeAward,
      });
    }
  }

  if (!slides.length) {
    const headline = takeField(cleaned, ["Headline", "Title"]);
    const subhead = takeField(cleaned, ["Sub-headline", "Subhead", "Sub headline"]);
    const bodyField = takeField(cleaned, ["Body Copy", "Body", "Text"]);
    const structured = Boolean(headline || subhead || bodyField);
    const designed = designBrief(structured ? [headline, subhead, bodyField].filter(Boolean).join("\n") : cleaned);
    slides.push({
      index: 1,
      label: "Poster",
      role: "slide",
      visualIdea: [takeField(cleaned, ["Visual Idea"]), designed.visual].filter(Boolean).join(". "),
      headline,
      subhead,
      body: structured ? bodyField || cleaned : cleaned,
      mustPrint: designed.lines,
      freeform: !structured,
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
  const url = siteUrl || (house ? DIGISOL_SITE_URL : "");
  if (url && !/https?:\/\/|www\./i.test(blob)) {
    extras.push(url);
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
