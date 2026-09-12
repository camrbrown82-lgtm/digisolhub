export type CompanyBrand = {
  tagline: string;
  voice: string;
  audience: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  fonts: string;
  doSay: string;
  dontSay: string;
  extra: string;
  visualStyle: string;
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
  fonts: "Inter, Arial, Helvetica, sans-serif",
  doSay:
    "engineering meets growth, high-converting, custom build, no template bloat, one roof, first click to closed deal, ship, convert, clear next step",
  dontSay:
    "synergy, leverage, world-class, cutting-edge, full-service solutions, digital transformation, utilize, unlock your potential",
  extra:
    "House brand for DigiSol (wwwdigisol.com). Dual threat: custom Next.js / React engineering plus growth marketing. Fast pages, strong SEO, forms that become leads. Based in Alberta, Canada.",
  visualStyle:
    "Dark zinc studio, indigo and ice-blue glow, cinematic light, generous negative space. Premium digital campaign — not comic, pastel, or stock.",
};

export const NEUTRAL_BRAND: CompanyBrand = {
  tagline: "",
  voice: "",
  audience: "",
  primaryColor: "#3f3f46",
  secondaryColor: "#18181b",
  accentColor: "#a1a1aa",
  backgroundColor: "#09090b",
  fonts: "Inter, Arial, Helvetica, sans-serif",
  doSay: "",
  dontSay: "",
  extra: "",
  visualStyle: "",
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

export function parseBrand(value: unknown, fallback: CompanyBrand = NEUTRAL_BRAND): CompanyBrand {
  const row = asRecord(value);
  return {
    tagline: text(row.tagline, fallback.tagline),
    voice: text(row.voice, fallback.voice),
    audience: text(row.audience, fallback.audience),
    primaryColor: normalizeHex(text(row.primaryColor, ""), fallback.primaryColor),
    secondaryColor: normalizeHex(text(row.secondaryColor, ""), fallback.secondaryColor),
    accentColor: normalizeHex(text(row.accentColor, ""), fallback.accentColor),
    backgroundColor: normalizeHex(text(row.backgroundColor, ""), fallback.backgroundColor),
    fonts: text(row.fonts, fallback.fonts),
    doSay: text(row.doSay, fallback.doSay),
    dontSay: text(row.dontSay, fallback.dontSay),
    extra: text(row.extra, fallback.extra),
    visualStyle: text(row.visualStyle, fallback.visualStyle),
  };
}

export function brandFromClient(client?: { name?: string | null; branding?: unknown } | null) {
  const companyName = client?.name?.trim() || DIGISOL_HOUSE_NAME;
  const house = companyName.toLowerCase() === DIGISOL_HOUSE_NAME.toLowerCase();
  return {
    companyName,
    brand: parseBrand(client?.branding, house ? DIGISOL_BRAND : NEUTRAL_BRAND),
  };
}

export function brandVoicePrompt(companyName: string, brand: CompanyBrand) {
  return [
    `Brand name: ${companyName}`,
    brand.tagline ? `Tagline: ${brand.tagline}` : "",
    brand.voice ? `Voice / tone: ${brand.voice}` : "",
    brand.audience ? `Audience: ${brand.audience}` : "",
    `Colors: primary ${brand.primaryColor}, secondary ${brand.secondaryColor}, accent ${brand.accentColor}, background ${brand.backgroundColor}`,
    brand.fonts ? `Fonts: ${brand.fonts}` : "",
    brand.doSay ? `Words and phrases to lean on: ${brand.doSay}` : "",
    brand.dontSay ? `Words and phrases to avoid: ${brand.dontSay}` : "",
    brand.visualStyle ? `Visual style: ${brand.visualStyle}` : "",
    brand.extra ? `Other brand notes: ${brand.extra}` : "",
  ]
    .filter(Boolean)
    .join("\n");
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

function hexLuminance(hex: string) {
  const raw = hex.replace("#", "");
  const full = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;
  const n = Number.parseInt(full, 16);
  if (!Number.isFinite(n)) return 0;
  const r = (n >> 16) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function inferVisualStyle(brand: CompanyBrand) {
  const written = sanitizeVisualNotes(brand.visualStyle);
  if (written) return written;
  return hexLuminance(brand.backgroundColor) < 0.35
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
    `Dominant palette only: primary ${brand.primaryColor}, secondary ${brand.secondaryColor}, accent ${brand.accentColor}, background ${brand.backgroundColor}.`,
    `Typography feel like ${font}. If the company name appears, spell "${companyName}" exactly as a custom wordmark — no invented logos.`,
    `Art direction: ${inferVisualStyle(brand)}`,
    brand.doSay ? `Headline vocabulary: ${brand.doSay}` : "",
    brand.dontSay ? `Do not depict or write: ${brand.dontSay}` : "",
    extra ? `Other visual notes: ${extra}` : "",
    "Studio-quality print campaign, one focal idea, readable hierarchy, realistic materials and light. No photos of real people, no contact details, no QR codes, no watermarks, no tiny unreadable text, no stock-template look.",
  ]
    .filter(Boolean)
    .join("\n");

  return brief.slice(0, 3900);
}
