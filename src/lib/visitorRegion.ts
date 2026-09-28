/**
 * Visitor geo → marketing audience.
 * Alberta / Canada keep the local primary layout.
 * US + rest of world get a borderless, region-agnostic pitch.
 */

export const GEO_COUNTRY_COOKIE = "ds_geo_country";
export const GEO_AUDIENCE_COOKIE = "ds_audience";
export const GEO_CITY_COOKIE = "ds_geo_city";
export const GEO_REGION_COOKIE = "ds_geo_region";
/** Existing Alberta city lander cookie */
export const GEO_SLUG_COOKIE = "ds_geo_slug";
export const GEO_LAND_COOKIE = "ds_geo_landed";

export type VisitorAudience = "alberta" | "canada" | "international";

export type VisitorGeo = {
  city?: string | null;
  region?: string | null;
  country?: string | null;
};

export type VisitorRegion = {
  country: string;
  region: string;
  city: string;
  audience: VisitorAudience;
  /** ISO country, upper-case, or empty when unknown */
  countryCode: string;
  isInternational: boolean;
  /** Short label for UI / agent prompts */
  countryLabel: string;
};

const COUNTRY_LABELS: Record<string, string> = {
  US: "United States",
  CA: "Canada",
  GB: "United Kingdom",
  AU: "Australia",
  NZ: "New Zealand",
  IE: "Ireland",
  DE: "Germany",
  FR: "France",
  MX: "Mexico",
  IN: "India",
  PH: "Philippines",
};

export function normalizeCountryCode(value: string | null | undefined) {
  return (value || "").trim().toUpperCase();
}

export function resolveVisitorAudience(geo: VisitorGeo): VisitorAudience {
  const country = normalizeCountryCode(geo.country);
  if (!country || country === "XX" || country === "T1") {
    // Unknown / Tor — default to Alberta-first brand home (SEO-safe).
    return "alberta";
  }
  if (country !== "CA") return "international";

  const region = (geo.region || "").trim().toUpperCase();
  if (!region || region === "AB" || region === "ALBERTA") return "alberta";
  return "canada";
}

export function countryLabel(code: string) {
  const upper = normalizeCountryCode(code);
  if (!upper) return "your region";
  return COUNTRY_LABELS[upper] || upper;
}

export function buildVisitorRegion(geo: VisitorGeo): VisitorRegion {
  const countryCode = normalizeCountryCode(geo.country);
  const audience = resolveVisitorAudience(geo);
  return {
    country: countryCode,
    countryCode,
    region: (geo.region || "").trim(),
    city: (geo.city || "").trim(),
    audience,
    isInternational: audience === "international",
    countryLabel: countryLabel(countryCode),
  };
}

export function parseAudienceCookie(
  value: string | null | undefined,
): VisitorAudience | null {
  if (value === "alberta" || value === "canada" || value === "international") {
    return value;
  }
  return null;
}

/** Homepage / city-lander marketing copy. */
export type HomeCopy = {
  heroEyebrow: string;
  heroTitleLead: string;
  heroTitleAccent: string;
  heroTitleTail: string;
  heroTagline: string;
  heroSub: string;
  heroBody: string;
  heroMarkets: string;
  whyTitle: string;
  whyBody: string;
  designBook: string;
  devSpeed: string;
  mktPaid: string;
  mktSeo: string;
  audienceIntro: string;
  audienceStartupBody: string;
  audienceStartupPoint: string;
  audienceEstablishedBody: string;
  servicesPaid: string;
  servicesCommerce: string;
  auditBody: string;
  contactTitle: string;
  contactBody: string;
  chatGreetingAudience: string;
};