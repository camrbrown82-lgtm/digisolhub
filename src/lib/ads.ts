const adsId = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID?.trim() || "";
const adsLabel = process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL?.trim() || "";

export const GOOGLE_ADS_ID = /^AW-\d+$/.test(adsId) ? adsId : "";
export const GOOGLE_ADS_CONVERSION_LABEL = /^[\w-]+$/.test(adsLabel)
  ? adsLabel
  : "";

export function googleAdsSendTo() {
  if (!GOOGLE_ADS_ID) return "";
  if (!GOOGLE_ADS_CONVERSION_LABEL) return GOOGLE_ADS_ID;
  return `${GOOGLE_ADS_ID}/${GOOGLE_ADS_CONVERSION_LABEL}`;
}
