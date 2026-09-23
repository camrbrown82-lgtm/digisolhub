/**
 * Meta (Facebook) Pixel + optional Conversions API test event code.
 * Set NEXT_PUBLIC_META_PIXEL_ID on Vercel. For Events Manager tests, set
 * NEXT_PUBLIC_META_TEST_EVENT_CODE=TEST23217 (remove after verification).
 */

const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() || "";
const testEventCode =
  process.env.NEXT_PUBLIC_META_TEST_EVENT_CODE?.trim() || "";

export const META_PIXEL_ID = /^\d{5,20}$/.test(pixelId) ? pixelId : "";
export const META_TEST_EVENT_CODE = /^TEST\d+$/i.test(testEventCode)
  ? testEventCode.toUpperCase()
  : "";

export function metaPixelConfigured() {
  return Boolean(META_PIXEL_ID);
}
