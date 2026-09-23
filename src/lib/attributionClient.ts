/**
 * Client-side first-touch attribution (UTM + Meta click ids).
 * Stored in sessionStorage so contact forms / Kaylev can attach it later.
 */

export const ATTRIBUTION_STORAGE_KEY = "ds_attribution_v1";

export type ClientAttribution = {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  fbclid: string | null;
  fbp: string | null;
  fbc: string | null;
  landing_path: string | null;
  captured_at: string;
};

function readCookie(name: string) {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${name.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}=([^;]*)`),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

function param(search: URLSearchParams, key: string) {
  const value = search.get(key)?.trim();
  return value || null;
}

export function readStoredAttribution(): ClientAttribution | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(ATTRIBUTION_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ClientAttribution;
  } catch {
    return null;
  }
}

export function captureAttributionFromLocation(
  href = typeof window !== "undefined" ? window.location.href : "",
): ClientAttribution | null {
  if (typeof window === "undefined" || !href) return null;

  const url = new URL(href);
  const search = url.searchParams;
  const existing = readStoredAttribution();

  const incoming: ClientAttribution = {
    utm_source: param(search, "utm_source"),
    utm_medium: param(search, "utm_medium"),
    utm_campaign: param(search, "utm_campaign"),
    utm_content: param(search, "utm_content"),
    utm_term: param(search, "utm_term"),
    fbclid: param(search, "fbclid"),
    fbp: readCookie("_fbp"),
    fbc: readCookie("_fbc"),
    landing_path: `${url.pathname}${url.search}`,
    captured_at: new Date().toISOString(),
  };

  const hasTouch =
    Boolean(incoming.utm_source) ||
    Boolean(incoming.utm_campaign) ||
    Boolean(incoming.fbclid);

  // First-touch: keep original UTMs; always refresh fbp/fbc cookies.
  const merged: ClientAttribution = {
    utm_source: existing?.utm_source || incoming.utm_source,
    utm_medium: existing?.utm_medium || incoming.utm_medium,
    utm_campaign: existing?.utm_campaign || incoming.utm_campaign,
    utm_content: existing?.utm_content || incoming.utm_content,
    utm_term: existing?.utm_term || incoming.utm_term,
    fbclid: existing?.fbclid || incoming.fbclid,
    fbp: incoming.fbp || existing?.fbp || null,
    fbc:
      incoming.fbc ||
      existing?.fbc ||
      (incoming.fbclid || existing?.fbclid
        ? `fb.1.${Date.now()}.${incoming.fbclid || existing?.fbclid}`
        : null),
    landing_path: existing?.landing_path || incoming.landing_path,
    captured_at: existing?.captured_at || incoming.captured_at,
  };

  if (hasTouch || merged.fbp || merged.fbc || existing) {
    try {
      sessionStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(merged));
    } catch {
      // ignore quota / private mode
    }
  }

  return merged;
}

export function getAttributionForSubmit(): ClientAttribution | null {
  const fresh = captureAttributionFromLocation();
  return fresh || readStoredAttribution();
}

export function newMetaEventId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `lead_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
