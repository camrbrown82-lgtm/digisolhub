export const DIGISOL_SITE_URL = "https://wwwdigisol.com";

/** Opens Kaylev on the free website audit. Used by cards and posters, not by ads. */
export function kaylevAuditUrl() {
  return `${DIGISOL_SITE_URL}/?kaylev=audit`;
}

/** Facebook and Instagram ads land on the site. The visitor then clicks Free audit or asks Kaylev. */
export function digisolAdsLandingUrl() {
  return `${DIGISOL_SITE_URL}/`;
}

export function isDigisolSiteUrl(url: string) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    const siteHost = new URL(DIGISOL_SITE_URL).hostname.replace(/^www\./, "");
    return host === siteHost;
  } catch {
    return false;
  }
}

/** Host shown next to a QR code. The code itself carries the full tracked link. */
export function siteHostLabel(url: string) {
  try {
    const withProtocol = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    return new URL(withProtocol).hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  }
}

/**
 * QR destination for the Working-on company.
 * DigiSol's own site opens Kaylev's free website audit. Every card and poster
 * records Kaylev as the visit source.
 */
export function kaylevSourceUrl(siteUrl: string, campaign: "business-card" | "poster") {
  const raw = siteUrl.trim();
  if (!raw) return "";
  const absolute = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  let url: URL;
  try {
    url = new URL(isDigisolSiteUrl(absolute) ? kaylevAuditUrl() : absolute);
  } catch {
    return "";
  }
  url.searchParams.set("utm_source", "kaylev");
  url.searchParams.set("utm_medium", "qr");
  url.searchParams.set("utm_campaign", campaign);
  return url.toString();
}

export const DIGISOL_FOUNDER = "Cameron Brown";
export const DIGISOL_FOUNDER_TITLE = "Founder & CEO";
/** Public business inbox — use everywhere visitors / schema / Kaylev see email. */
export const DIGISOL_EMAIL = "cam@wwwdigisol.com";
/**
 * Facebook Page (not a personal profile). Override with
 * NEXT_PUBLIC_DIGISOL_FACEBOOK_URL if the vanity URL changes.
 */
export const DIGISOL_FACEBOOK_URL =
  process.env.NEXT_PUBLIC_DIGISOL_FACEBOOK_URL?.trim() ||
  "https://www.facebook.com/profile.php?id=61594718912547";
/**
 * LinkedIn company page. Empty hides LinkedIn everywhere (site links, share
 * buttons, Campaigns channels, Hub publishing) until the business page is live.
 */
export const DIGISOL_LINKEDIN_URL =
  process.env.NEXT_PUBLIC_DIGISOL_LINKEDIN_URL?.trim() || "";
export const LINKEDIN_ENABLED = Boolean(DIGISOL_LINKEDIN_URL);
export const SOCIAL_NETWORKS_LABEL = LINKEDIN_ENABLED
  ? "Facebook, LinkedIn, Instagram, and X"
  : "Facebook, Instagram, and X";
export const DIGISOL_X_HANDLE =
  process.env.NEXT_PUBLIC_DIGISOL_X_HANDLE?.trim().replace(/^@/, "") || "CBrown0169";
export const DIGISOL_X_URL = `https://x.com/${DIGISOL_X_HANDLE}`;
/** X card attribution. Spread into every page twitter block so it is not dropped. */
export const DIGISOL_X_CARD = {
  site: `@${DIGISOL_X_HANDLE}`,
  creator: `@${DIGISOL_X_HANDLE}`,
} as const;
export const DIGISOL_INSTAGRAM_HANDLE =
  process.env.NEXT_PUBLIC_DIGISOL_INSTAGRAM_HANDLE?.trim() || "digi.sol20269";
export const DIGISOL_INSTAGRAM_URL =
  `https://www.instagram.com/${DIGISOL_INSTAGRAM_HANDLE}/`;
export const DIGISOL_YOUTUBE_URL =
  process.env.NEXT_PUBLIC_DIGISOL_YOUTUBE_URL?.trim() ||
  "https://www.youtube.com/channel/UC5pqH5vLTuTTp_RyIZ2HllQ";
/** Where the site's YouTube icon sends visitors; schema sameAs keeps the channel URL. */
export const DIGISOL_YOUTUBE_FEATURED_URL =
  process.env.NEXT_PUBLIC_DIGISOL_YOUTUBE_FEATURED_URL?.trim() ||
  "https://youtu.be/hrSZwIqXStA";
export const DIGISOL_TIKTOK_HANDLE =
  process.env.NEXT_PUBLIC_DIGISOL_TIKTOK_HANDLE?.trim() || "digisol96";
export const DIGISOL_TIKTOK_URL = `https://www.tiktok.com/@${DIGISOL_TIKTOK_HANDLE}`;
export const DIGISOL_GOOGLE_LISTING_URL =
  "https://g.page/r/CcL2FJtD6brkECE";
/** Direct “Write a review” link for the Google Business Profile. */
export const DIGISOL_GOOGLE_REVIEW_URL =
  "https://g.page/r/CcL2FJtD6brkECE/review";
/** Profiles Google / schema can associate with DigiSol (NAP + sameAs). */
export const DIGISOL_SAME_AS: readonly string[] = [
  DIGISOL_FACEBOOK_URL,
  ...(LINKEDIN_ENABLED ? [DIGISOL_LINKEDIN_URL] : []),
  DIGISOL_INSTAGRAM_URL,
  DIGISOL_X_URL,
  DIGISOL_YOUTUBE_URL,
  DIGISOL_TIKTOK_URL,
  DIGISOL_GOOGLE_LISTING_URL,
];
export const DIGISOL_PHONE = "+1-587-577-0782";
export const DIGISOL_PHONE_DISPLAY = "587-577-0782";
export const DIGISOL_TEL_HREF = "tel:+15875770782";
export const DIGISOL_SMS_HREF = "sms:+15875770782";
/** Online booking page (Google Calendar appointment schedule, Cal.com, etc.). Empty hides "Book a call". */
export const DIGISOL_BOOKING_URL =
  process.env.NEXT_PUBLIC_DIGISOL_BOOKING_URL?.trim() || "";
export const DIGISOL_REGION = "Alberta, Canada";
export const DIGISOL_STREET_ADDRESS = "969 Channelside Rd SW";
export const DIGISOL_CITY = "Airdrie";
export const DIGISOL_POSTAL_CODE = "T4B 3J4";
export const DIGISOL_ADDRESS_LINE =
  "969 Channelside Rd SW, Airdrie, AB T4B 3J4";
const MAP_QUERY = encodeURIComponent(`DigiSol, ${DIGISOL_ADDRESS_LINE}`);
/** Keyless Google Maps embed of the HQ pin; `hl` sets the map labels' language. */
export const digisolMapEmbedUrl = (hl = "en") =>
  `https://maps.google.com/maps?q=${MAP_QUERY}&z=14&hl=${hl}&output=embed`;
export const DIGISOL_DIRECTIONS_URL = `https://www.google.com/maps/dir/?api=1&destination=${MAP_QUERY}`;
/** Approximate HQ coordinates for LocalBusiness schema (Channelside SW, Airdrie). */
export const DIGISOL_GEO = {
  latitude: 51.2708,
  longitude: -114.0315,
} as const;
export const DIGISOL_SERVICE_CITIES = [
  "Airdrie",
  "Calgary",
  "Edmonton",
  "Red Deer",
  "Cochrane",
] as const;
