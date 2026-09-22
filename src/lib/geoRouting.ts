import { LOCATION_PAGES } from "@/lib/locations";

/** Map Vercel/Cloudflare geo city labels → DigiSol /locations/{slug}. */
const CITY_ALIASES: Record<string, string> = {
  calgary: "calgary",
  edmonton: "edmonton",
  "red deer": "red-deer",
  reddeer: "red-deer",
  cochrane: "cochrane",
  airdrie: "airdrie",
  // Nearby metros → closest lander
  okotoks: "calgary",
  "st. albert": "edmonton",
  "st albert": "edmonton",
  "sherwood park": "edmonton",
  lacombe: "red-deer",
  innisfail: "red-deer",
  chestermere: "calgary",
  "rocky view": "cochrane",
};

const VALID_SLUGS = new Set(LOCATION_PAGES.map((page) => page.slug));

export function normalizeGeoCity(value: string | null | undefined) {
  if (!value?.trim()) return "";
  let decoded = value.trim();
  try {
    decoded = decodeURIComponent(decoded.replace(/\+/g, " "));
  } catch {
    // keep raw
  }
  return decoded.toLowerCase().replace(/\s+/g, " ");
}

/** Resolve a DigiSol location slug from IP geo city (+ optional region). */
export function locationSlugFromGeo(input: {
  city?: string | null;
  region?: string | null;
  country?: string | null;
}) {
  const country = (input.country || "").toUpperCase();
  if (country && country !== "CA") return null;

  const region = (input.region || "").toUpperCase();
  // Prefer Alberta; still allow city match if region missing.
  if (region && region !== "AB" && region !== "ALBERTA") return null;

  const city = normalizeGeoCity(input.city);
  if (!city) return null;

  const slug = CITY_ALIASES[city];
  if (slug && VALID_SLUGS.has(slug)) return slug;
  return null;
}

export function isLikelyBot(userAgent: string | null | undefined) {
  if (!userAgent) return false;
  return /bot|crawl|spider|slurp|facebookexternalhit|preview|lighthouse|headless|bingpreview|yandex|baidu|duckduck|semrush|ahrefs|googleother/i.test(
    userAgent,
  );
}
