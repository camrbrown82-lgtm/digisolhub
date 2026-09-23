import { createHash } from "crypto";
import { META_PIXEL_ID } from "@/lib/metaPixel";

function firstEnv(...names: string[]) {
  for (const name of names) {
    const value = process.env[name]?.trim().replace(/^["']|["']$/g, "");
    if (value) return value;
  }
  return "";
}

/** Pixel ID for browser + Conversions API. */
export function metaPixelId() {
  return META_PIXEL_ID || firstEnv("META_PIXEL_ID");
}

/**
 * Token for CAPI / Ads Insights.
 * Prefer META_CAPI_ACCESS_TOKEN (system user with ads_management / ads_read).
 * Falls back to page token when that is all that is configured.
 */
export function metaAccessToken() {
  return firstEnv(
    "META_CAPI_ACCESS_TOKEN",
    "META_ADS_ACCESS_TOKEN",
    "META_PAGE_ACCESS_TOKEN",
    "FACEBOOK_PAGE_ACCESS_TOKEN",
  );
}

/** Ad account id — accepts with or without act_ prefix. */
export function metaAdAccountId() {
  const raw = firstEnv("META_AD_ACCOUNT_ID", "FACEBOOK_AD_ACCOUNT_ID");
  if (!raw) return "";
  return raw.startsWith("act_") ? raw : `act_${raw.replace(/\D/g, "")}`;
}

export function metaGraphVersion() {
  return firstEnv("META_GRAPH_VERSION") || "v21.0";
}

export function metaCapiConfigured() {
  return Boolean(metaPixelId() && metaAccessToken());
}

export function metaAdsInsightsConfigured() {
  return Boolean(metaAccessToken() && metaAdAccountId());
}

export function sha256Hex(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function hashEmailForMeta(email: string) {
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes("@")) return "";
  return sha256Hex(normalized);
}

export function hashPhoneForMeta(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 7) return "";
  // E.164-ish: keep country code if present; else assume CA/US +1
  const e164 = digits.length === 10 ? `1${digits}` : digits;
  return sha256Hex(e164);
}
