export type CompanyBrand = {
  tagline: string;
  voice: string;
  audience: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  highlightColor: string;
  fonts: string;
  doSay: string;
  dontSay: string;
  extra: string;
  visualStyle: string;
  logoUrl: string;
  logoDescription: string;
};

export const DIGISOL_HOUSE_NAME = "DigiSol";
export const DIGISOL_HOUSE_DOMAIN = "wwwdigisol.com";

export const DIGISOL_BRAND: CompanyBrand = {
  tagline: "Where engineering meets growth",
  voice:
    "Direct, human, and specific. Talk like a builder who also understands the sale. No corporate fog, no agency theater. Proud of the craft without sounding stiff. Short sentences. One clear next step.",
  audience:
    "Alberta and Canadian owners, operators, and auction or service businesses who need a site that converts — not a template that looks busy.",
  primaryColor: "#4f46e5",
  secondaryColor: "#09090b",
  accentColor: "#60a5fa",
  backgroundColor: "#09090b",
  textColor: "#f4f4f5",
  highlightColor: "#60a5fa",
  fonts: "Inter, Arial, Helvetica, sans-serif",
  doSay:
    "engineering meets growth, high-converting, custom build, no template bloat, one roof, first click to closed deal, ship, convert, clear next step",
  dontSay:
    "synergy, leverage, world-class, cutting-edge, full-service solutions, digital transformation, utilize, unlock your potential",
  extra:
    "House brand for DigiSol (wwwdigisol.com). Dual threat: custom Next.js / React engineering plus growth marketing. Fast pages, strong SEO, forms that become leads. Based in Alberta, Canada.",
  visualStyle:
    "Dark zinc studio, indigo and ice-blue glow, cinematic light, generous negative space. Premium digital campaign — not comic, pastel, or stock.",
  logoUrl: "",
  logoDescription:
    "DigiSol wordmark: clean sans-serif lettering, indigo to ice-blue accent on a dark zinc field. No extra icon unless already present in the official mark.",
};

export const NEUTRAL_BRAND: CompanyBrand = {
  tagline: "",
  voice: "",
  audience: "",
  primaryColor: "#3f3f46",
  secondaryColor: "#18181b",
  accentColor: "#a1a1aa",
  backgroundColor: "#09090b",
  textColor: "#f4f4f5",
  highlightColor: "#a1a1aa",
  fonts: "Inter, Arial, Helvetica, sans-serif",
  doSay: "",
  dontSay: "",
  extra: "",
  visualStyle: "",
  logoUrl: "",
  logoDescription: "",
};

export function isBrandEmpty(value: unknown) {
  const row = asRecord(value);
  return !Object.values(row).some((item) => typeof item === "string" && item.trim());
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function text(value: unknown, fallback: string) {
  return typeof value === "string" ? value : fallback;
}

export function normalizeHex(value: string, fallback: string) {
  const raw = value.trim();
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(raw)) return raw.toLowerCase();
  if (/^([0-9a-f]{3}|[0-9a-f]{6})$/i.test(raw)) return `#${raw.toLowerCase()}`;
  return fallback;
}

export function hexLuminance(hex: string) {
  const raw = hex.replace("#", "");
  const full = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;
  const n = Number.parseInt(full, 16);
  if (!Number.isFinite(n)) return 0;
  const r = (n >> 16) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function inferredTextColor(background: string) {
  return hexLuminance(background) < 0.35 ? "#f4f4f5" : "#18181b";
}

export function isDarkBrand(brand: CompanyBrand) {
  return hexLuminance(brand.backgroundColor) < 0.35;
}

export function brandColorLock(brand: CompanyBrand) {
  const dark = isDarkBrand(brand);
  return [
    `BACKGROUND: ${brand.backgroundColor} full-bleed. ${dark ? "This is a DARK poster. Forbidden: white, cream, ivory, beige, paper, light gray." : "This is a LIGHT poster. Forbidden: black or navy fields as the page."}`,
    `TEXT COLOR: ${brand.textColor}. Headlines, body, and captions use this (or a close tint). High contrast on the background.`,
    `HIGHLIGHTS: ${brand.highlightColor}. Use for glow, rules, buttons, and key words only.`,
    `PRIMARY: ${brand.primaryColor}. SECONDARY: ${brand.secondaryColor}. ACCENT: ${brand.accentColor}.`,
  ].join("\n");
}

export function parseBrand(value: unknown, fallback: CompanyBrand = NEUTRAL_BRAND): CompanyBrand {
  const row = asRecord(value);
  const backgroundColor = normalizeHex(text(row.backgroundColor, ""), fallback.backgroundColor);
  return {
    tagline: text(row.tagline, fallback.tagline),
    voice: text(row.voice, fallback.voice),
    audience: text(row.audience, fallback.audience),
    primaryColor: normalizeHex(text(row.primaryColor, ""), fallback.primaryColor),
    secondaryColor: normalizeHex(text(row.secondaryColor, ""), fallback.secondaryColor),
    accentColor: normalizeHex(text(row.accentColor, ""), fallback.accentColor),
    backgroundColor,
    textColor: normalizeHex(
      text(row.textColor, ""),
      fallback.textColor || inferredTextColor(backgroundColor),
    ),
    highlightColor: normalizeHex(
      text(row.highlightColor, ""),
      fallback.highlightColor || fallback.accentColor,
    ),
    fonts: text(row.fonts, fallback.fonts),
    doSay: text(row.doSay, fallback.doSay),
    dontSay: text(row.dontSay, fallback.dontSay),
    extra: text(row.extra, fallback.extra),
    visualStyle: text(row.visualStyle, fallback.visualStyle),
    logoUrl: text(row.logoUrl, fallback.logoUrl).trim(),
    logoDescription: text(row.logoDescription, fallback.logoDescription).trim(),
  };
}

export function mergeBrand(existing: unknown, incoming: unknown, fallback?: CompanyBrand) {
  const current = parseBrand(existing, fallback);
  const next = parseBrand(incoming, fallback);
  return {
    ...next,
    logoUrl: next.logoUrl || current.logoUrl,
    logoDescription: next.logoDescription || current.logoDescription,
  };
}

export type BrandPromptKind = "copy" | "visual" | "logo";

export function brandLogoPromptLine(brand: CompanyBrand) {
  if (brand.logoDescription.trim()) {
    return `Official logo — reproduce this exact mark, do not invent a new one: ${brand.logoDescription.trim()}`;
  }
  if (brand.logoUrl.trim()) {
    return "An official company logo is on file. Use that exact mark. Do not invent a substitute icon or wordmark.";
  }
  return "";
}

export function brandFromClient(client?: { name?: string | null; branding?: unknown } | null) {
  const companyName = client?.name?.trim() || DIGISOL_HOUSE_NAME;
  const house = companyName.toLowerCase() === DIGISOL_HOUSE_NAME.toLowerCase();
  return {
    companyName,
    brand: parseBrand(client?.branding, house ? DIGISOL_BRAND : NEUTRAL_BRAND),
  };
}

export function brandVoicePrompt(
  companyName: string,
  brand: CompanyBrand,
  kind: BrandPromptKind = "copy",
) {
  return [
    `Brand name: ${companyName}`,
    brand.tagline ? `Tagline: ${brand.tagline}` : "",
    brand.voice ? `Voice / tone: ${brand.voice}` : "",
    brand.audience ? `Audience: ${brand.audience}` : "",
    `Colors: background ${brand.backgroundColor}, text ${brand.textColor}, highlights ${brand.highlightColor}, primary ${brand.primaryColor}, secondary ${brand.secondaryColor}, accent ${brand.accentColor}`,
    brand.fonts ? `Fonts: ${brand.fonts}` : "",
    brand.doSay ? `Words and phrases to lean on: ${brand.doSay}` : "",
    brand.dontSay ? `Words and phrases to avoid: ${brand.dontSay}` : "",
    brand.visualStyle ? `Visual style: ${brand.visualStyle}` : "",
    kind === "visual"
      ? `Official logo for ${companyName} is stamped on after generation. Do not describe, draw, or letter the company name.`
      : brandLogoPromptLine(brand),
    kind === "visual"
      ? ""
      : brand.logoUrl
        ? `Official logo file is on record for ${companyName}.`
        : "",
    brand.extra ? `Other brand notes: ${brand.extra}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function brandLockRules(
  companyName: string,
  brand: CompanyBrand,
  kind: BrandPromptKind,
) {
  const house = companyName.toLowerCase() === DIGISOL_HOUSE_NAME.toLowerCase();
  const lines = [
    `HARD BRAND LOCK — produce work only for ${companyName}.`,
    house
      ? kind === "visual"
        ? "This is the DigiSol house brand. Use DigiSol voice and palette only."
        : "This is the DigiSol house brand. Use DigiSol voice, palette, and mark."
      : `This is not DigiSol. Do not use DigiSol voice, indigo house look, tagline, claims, or logo. Only ${companyName}.`,
    `Voice: ${brand.voice || "Plain, specific, human. No agency filler."}`,
    `Audience: ${brand.audience || "this company's real customers"}`,
    `Palette: ${brandColorLock(brand)}`,
    brand.fonts ? `Typography: ${brand.fonts}` : "",
    brand.doSay ? `Lean on: ${brand.doSay}` : "",
    brand.dontSay ? `Never use: ${brand.dontSay}` : "",
    kind === "visual"
      ? `Do not draw a logo or invent a wordmark. The official logo is stamped on after generation. User-supplied copy may include the company name as small footer type only if it is in the brief.`
      : brandLogoPromptLine(brand) ||
        (kind === "logo"
          ? `Create a new official mark for ${companyName} only. Spell the name exactly.`
          : `No official logo on file. Do not invent one. If lettering appears, spell "${companyName}" exactly.`),
    "Do not invent offers, prices, cities, testimonials, partner marks, or a second slogan that are not in this kit.",
    "If a detail is missing, omit it. Never fill gaps with another company's brand.",
  ];
  if (kind === "copy") {
    lines.push(
      "Merge tags you may use exactly as written: {{name}}, {{company}}, {{logo}}, {{tagline}}, {{primary}}, {{secondary}}, {{accent}}, {{background}}, {{text}}, {{highlight}}, {{fonts}}.",
      "Leave those tags in place so they can be filled per contact. Do not replace {{logo}} with a made-up icon.",
      "The email chrome already stamps the official logo in the header. You may also put {{logo}} on its own line in the body.",
      `Sign off as {{company}} or ${companyName}, not a generic agency.`,
    );
  }
  if (kind === "visual") {
    lines.push(
      brandColorLock(brand),
      "Fill the canvas with the layout. Do not leave a fake logo hole — the official logo is composited on a separate brand bar after generation, never over the copy.",
      "Typeset the supplied headline and body exactly. Do not replace them with the brand tagline or a shorter slogan.",
    );
  }
  return lines.filter(Boolean).join("\n");
}

export function brandKitPrompt(
  companyName: string,
  brand: CompanyBrand,
  kind: BrandPromptKind,
) {
  return [brandVoicePrompt(companyName, brand, kind), brandLockRules(companyName, brand, kind)]
    .filter(Boolean)
    .join("\n\n");
}

export function enforceVisualBrandLock(
  prompt: string,
  companyName: string,
  brand: CompanyBrand,
) {
  const lock = brandLockRules(companyName, brand, "visual");
  return `${prompt.trim()}\n\n${lock}`.slice(0, 3900);
}

export function sanitizeVisualNotes(value: string) {
  return value
    .replace(/\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/gi, "")
    .replace(/\+?\d[\d\s().-]{8,}\d/g, "")
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/\buse our logo\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function inferVisualStyle(brand: CompanyBrand) {
  const written = sanitizeVisualNotes(brand.visualStyle);
  if (written) return written;
  return isDarkBrand(brand)
    ? "Premium dark campaign poster. Cinematic lighting, restrained glow, tactile surfaces, generous negative space."
    : "Premium light editorial poster. Clean paper or studio surface, sharp type, airy negative space, no clutter.";
}

export function brandImagePrompt(
  companyName: string,
  brand: CompanyBrand,
  userPrompt: string,
  format = "portrait",
) {
  const font = brand.fonts.split(",")[0]?.trim() || "a clean sans";
  const extra = sanitizeVisualNotes(brand.extra);
  const brief = [
    `Create a high-end ${format} marketing poster for ${companyName}.`,
    `Job: ${userPrompt.trim()}`,
    brand.tagline ? `Tagline / mood: ${brand.tagline}` : "",
    brand.voice ? `Tone to translate into composition, lighting, and type: ${brand.voice}` : "",
    brand.audience ? `Made for this audience: ${brand.audience}` : "",
    brandColorLock(brand),
    `Typography feel like ${font}. Body and headlines in ${brand.textColor}.`,
    `Do not draw a logo or invent a wordmark for "${companyName}". A brand bar with the official logo is added after generation — fill the canvas with the layout, do not cover copy with a fake mark.`,
    "Typeset the job copy exactly. Do not replace headlines with the brand tagline.",
    `Art direction: ${inferVisualStyle(brand)}`,
    brand.doSay ? `Headline vocabulary: ${brand.doSay}` : "",
    brand.dontSay ? `Do not depict or write: ${brand.dontSay}` : "",
    extra ? `Other visual notes: ${extra}` : "",
    "Studio-quality social infographic, readable hierarchy, realistic materials and light. No photos of real people, no invented phone numbers, no QR codes, no watermarks, no tiny unreadable text, no stock-template look, no neon phone mockup unless the brief asks for a device.",
  ]
    .filter(Boolean)
    .join("\n");

  return brief.slice(0, 3900);
}
