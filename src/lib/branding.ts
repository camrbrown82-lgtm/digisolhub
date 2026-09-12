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
    "House brand for DigiSol (wwwdigisol.com). Dual threat: custom Next.js / React engineering plus growth marketing. Fast pages, strong SEO, forms that become leads. Based in Alberta, Canada. Contact cam.r.brown82@gmail.com or +1-587-577-0782. Logo is the DigiSol wordmark on /logo.jpg. Emails and posters should feel dark zinc with indigo/blue glow, not comic or pastel.",
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

export function parseBrand(value: unknown): CompanyBrand {
  const row = asRecord(value);
  return {
    tagline: text(row.tagline, DIGISOL_BRAND.tagline),
    voice: text(row.voice, DIGISOL_BRAND.voice),
    audience: text(row.audience, DIGISOL_BRAND.audience),
    primaryColor: normalizeHex(text(row.primaryColor, ""), DIGISOL_BRAND.primaryColor),
    secondaryColor: normalizeHex(text(row.secondaryColor, ""), DIGISOL_BRAND.secondaryColor),
    accentColor: normalizeHex(text(row.accentColor, ""), DIGISOL_BRAND.accentColor),
    backgroundColor: normalizeHex(text(row.backgroundColor, ""), DIGISOL_BRAND.backgroundColor),
    fonts: text(row.fonts, DIGISOL_BRAND.fonts),
    doSay: text(row.doSay, DIGISOL_BRAND.doSay),
    dontSay: text(row.dontSay, DIGISOL_BRAND.dontSay),
    extra: text(row.extra, DIGISOL_BRAND.extra),
  };
}

export function brandFromClient(client?: { name?: string | null; branding?: unknown } | null) {
  return {
    companyName: client?.name?.trim() || "DigiSol",
    brand: parseBrand(client?.branding),
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
    brand.extra ? `Other brand notes: ${brand.extra}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function brandImagePrompt(companyName: string, brand: CompanyBrand, userPrompt: string) {
  const style = [
    `Company: ${companyName}`,
    brand.tagline ? `Mood line: ${brand.tagline}` : "",
    `Palette: ${brand.primaryColor}, ${brand.secondaryColor}, ${brand.accentColor}, ${brand.backgroundColor}`,
    brand.fonts ? `Clean ${brand.fonts.split(",")[0]}-like sans type` : "",
    "Dark zinc background, indigo and blue glow, premium digital studio poster.",
    "No photos of real people, no contact details, no copied trademarks, no tiny unreadable text.",
  ]
    .filter(Boolean)
    .join(". ");

  return `${userPrompt.trim()}\n\nVisual style: ${style}`.slice(0, 3900);
}
