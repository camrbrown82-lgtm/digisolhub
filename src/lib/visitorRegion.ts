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

/** Homepage / chat copy keyed by audience. */
export function homeCopyForAudience(audience: VisitorAudience) {
  if (audience === "international") {
    return {
      heroEyebrow: "Website design, engineering & growth marketing",
      heroTitleLead: "Website Design,",
      heroTitleAccent: "Development & Marketing",
      heroTitleTail: "",
      heroTagline: "Where Design, Engineering, and Growth Meet",
      heroSub:
        "Custom websites we design and build — then marketing that fills them",
      heroBody:
        "DigiSol partners with growing companies on brand-led websites, modern Next.js builds, SEO, and paid media. Whether you serve a local market or customers across borders, we design the site, engineer the platform, and help the right people find you and convert.",
      heroMarkets: "Remote-friendly · North America & beyond",
      whyTitle: "The DigiSol Advantage",
      whyBody:
        "We design the website, engineer it to convert, and market it — one partner, not a designer, a developer, and an agency.",
      designBook: "Pages built around how your customers actually inquire and buy",
      devSpeed: "Lightning-fast load times that protect SEO and conversions",
      mktPaid: "Targeted Meta & Search campaigns matched to your market",
      mktSeo: "SEO and local discovery tuned to the places you actually sell",
      audienceIntro:
        "Startups and established companies get the same playbook: a designed website, code that converts, and marketing that ships — wherever you operate.",
      audienceStartupBody:
        "A designed site and a lean custom build so you launch looking real — then clear positioning so the right customers can find you.",
      audienceStartupPoint: "Launch strategy and market positioning",
      audienceEstablishedBody:
        "Redesign the site customers actually use, then modernize the platform under it — with marketing and conversion work wired in for established companies.",
      servicesPaid:
        "Google Ads, Meta Ads, and SEO so searches in your markets turn into customers.",
      servicesCommerce:
        "Online stores and custom auction/web platforms for retailers and service businesses that need to sell, list, and grow.",
      auditBody:
        "A short presentation on what businesses should fix first — design, speed, SEO, and the path from visit to booked work. Export ready captions for Facebook, LinkedIn, and Instagram below.",
      contactTitle: "Ready to Grow Your Business Online?",
      contactBody:
        "Get a project quote or free strategy consult for website design, custom development, SEO, and campaigns — built for companies that sell locally or across borders.",
      chatGreetingAudience: "businesses",
    } as const;
  }

  // canada + alberta share Alberta-first primary layout
  return {
    heroEyebrow: "Alberta-first website design, engineering & local growth",
    heroTitleLead: "Website Design,",
    heroTitleAccent: "Development & Marketing",
    heroTitleTail: "in Alberta",
    heroTagline: "Where Design, Engineering, and Growth Meet",
    heroSub:
      "Custom websites we design and build — then local marketing that fills them",
    heroBody:
      "We start with local businesses. Based in Airdrie, we design the site, engineer the platform, and run local SEO, Google Ads, and Meta campaigns for Calgary, Edmonton, and companies across Alberta — so nearby customers can find you and convert.",
    heroMarkets: "Airdrie · Calgary · Edmonton · Red Deer · Cochrane · Across Alberta",
    whyTitle: "The DigiSol Advantage for Alberta",
    whyBody:
      "We design the website, engineer it to convert, and market it locally — one partner, not a designer, a developer, and an agency.",
    designBook: "Pages built around how Alberta customers actually book",
    devSpeed: "Lightning-fast load times that protect Alberta SEO and conversions",
    mktPaid: "Targeted Meta & Search campaigns for Alberta local companies",
    mktSeo: "Local SEO that wins the Airdrie, Calgary, Edmonton, and Alberta map pack",
    audienceIntro:
      "Local Alberta companies first. Startups and established businesses in Airdrie, Calgary, Edmonton, and across the province get the same playbook: a designed website, code that converts, and marketing that ships.",
    audienceStartupBody:
      "A designed site and a lean custom build so you launch looking real — then local Alberta positioning so nearby customers can find you.",
    audienceStartupPoint: "Launch strategy and Alberta market positioning",
    audienceEstablishedBody:
      "Redesign the site customers actually use, then modernize the platform under it — with local marketing and conversion work wired in for established Alberta companies.",
    servicesPaid:
      "Google Ads, Meta Ads, and local SEO for Airdrie, Calgary, Edmonton, and nearby Alberta markets — so local searches turn into customers.",
    servicesCommerce:
      "Online stores and custom auction/web platforms for Alberta retailers and service businesses that need to sell, list, and grow.",
    auditBody:
      "A short presentation on what Alberta businesses should fix first — design, speed, local SEO, and the path from visit to booked work. Export ready captions for Facebook, LinkedIn, and Instagram below.",
    contactTitle: "Ready to Scale Your Alberta Business?",
    contactBody:
      "Get a project quote or free strategy consult for website design, custom development, local SEO, and campaigns in Airdrie, Calgary, Edmonton, and across Alberta.",
    chatGreetingAudience: "Alberta businesses",
  } as const;
}

export type HomeCopy = ReturnType<typeof homeCopyForAudience>;
