import sharp from "sharp";
import { brandFromClient, DIGISOL_BRAND, DIGISOL_HOUSE_NAME, type CompanyBrand } from "@/lib/branding";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import { DIGISOL_SITE_URL } from "@/lib/site";

/** The award is DigiSol's, so every badge uses DigiSol's kit (Hub > Brand while Working on DigiSol). */
export type AwardTheme = {
  background: string;
  primary: string;
  highlight: string;
  text: string;
  /** Emblem URL for pages; `logoData` is an inline copy for badges that can't load outside files. */
  logoUrl: string;
  logoData: string | null;
};

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** Normalized to #rrggbb so an alpha suffix can be appended. */
function hex(value: string | undefined, fallback: string) {
  const raw = (value || "").trim();
  if (!HEX.test(raw)) return fallback;
  return raw.length === 4 ? `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}` : raw.toLowerCase();
}

function absolute(url: string) {
  if (!url) return "";
  return url.startsWith("http") ? url : `${DIGISOL_SITE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

async function houseBrand(): Promise<CompanyBrand> {
  if (!hasAdminClient()) return DIGISOL_BRAND;
  const { data } = await createAdminClient()
    .from("clients")
    .select("name, branding")
    .ilike("name", DIGISOL_HOUSE_NAME)
    .maybeSingle();
  return data ? brandFromClient(data).brand : DIGISOL_BRAND;
}

async function inlineLogo(url: string) {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const png = await sharp(Buffer.from(await res.arrayBuffer()))
      .resize(112, 112, { fit: "cover" })
      .png({ compressionLevel: 9, palette: true })
      .toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    return null;
  }
}

/** Theme for the on-page badge component (no inline logo copy). */
export async function awardBadgeTheme() {
  const { background, primary, highlight, text, logoUrl } = await awardTheme();
  return { background, primary, highlight, text, logoUrl };
}

let cached: { at: number; theme: AwardTheme } | null = null;
const TTL_MS = 10 * 60 * 1000;

export async function awardTheme(): Promise<AwardTheme> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.theme;
  const brand = await houseBrand().catch(() => DIGISOL_BRAND);
  const logoUrl = absolute(brand.secondaryLogoUrl || brand.logoUrl || DIGISOL_BRAND.secondaryLogoUrl);
  const theme: AwardTheme = {
    background: hex(brand.backgroundColor, DIGISOL_BRAND.backgroundColor),
    primary: hex(brand.primaryColor, DIGISOL_BRAND.primaryColor),
    highlight: hex(brand.highlightColor || brand.accentColor, DIGISOL_BRAND.highlightColor),
    text: hex(brand.textColor, DIGISOL_BRAND.textColor),
    logoUrl,
    logoData: await inlineLogo(logoUrl),
  };
  cached = { at: Date.now(), theme };
  return theme;
}
