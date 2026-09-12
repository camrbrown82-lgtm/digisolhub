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

export const DIGISOL_BRAND: CompanyBrand = {
  tagline: "Engineering & growth",
  voice: "Direct, human, and specific. No corporate fog. Proud of the craft without sounding stiff.",
  audience: "Owners and operators who want a site that actually converts.",
  primaryColor: "#4f46e5",
  secondaryColor: "#09090b",
  accentColor: "#818cf8",
  backgroundColor: "#f4f4f5",
  fonts: "Inter, Arial, Helvetica, sans-serif",
  doSay: "build, ship, convert, clear next step",
  dontSay: "synergy, leverage, world-class, cutting-edge",
  extra: "",
};

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
  return `${userPrompt}

Match this company brand exactly:
${brandVoicePrompt(companyName, brand)}
Use the brand colors as the dominant palette. Keep typography simple and poster-readable. Do not invent a different logo or company name.`;
}
