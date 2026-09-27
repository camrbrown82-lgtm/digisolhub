import { trackEvent } from "@/lib/analytics";

const adsId = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID?.trim() || "";
const adsEvent =
  process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_EVENT?.trim() || "";

export const GOOGLE_ADS_ID = /^AW-\d+$/.test(adsId) ? adsId : "";

function cleanLabel(value: string | undefined) {
  const label = value?.trim() || "";
  return /^[\w-]+$/.test(label) ? label : "";
}

export type AdsConversionKind = "consult" | "purchase" | "chat_lead" | "contact_click";

/** NEXT_PUBLIC_* must be read literally so Next inlines them in the browser bundle. */
export const GOOGLE_ADS_LABELS: Record<AdsConversionKind, string> = {
  consult: cleanLabel(process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL),
  purchase: cleanLabel(process.env.NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_LABEL),
  chat_lead: cleanLabel(process.env.NEXT_PUBLIC_GOOGLE_ADS_CHAT_LEAD_LABEL),
  contact_click: cleanLabel(process.env.NEXT_PUBLIC_GOOGLE_ADS_CONTACT_CLICK_LABEL),
};

export const GOOGLE_ADS_CONVERSIONS: {
  kind: AdsConversionKind;
  label: string;
  envVar: string;
  firesOn: string;
}[] = [
  {
    kind: "consult",
    label: "Consult request",
    envVar: "NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL",
    firesOn: "Contact form → /confirmation",
  },
  {
    kind: "purchase",
    label: "Stripe purchase",
    envVar: "NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_LABEL",
    firesOn: "Paid checkout → /pricing/success (with amount)",
  },
  {
    kind: "chat_lead",
    label: "Kaylev chat lead",
    envVar: "NEXT_PUBLIC_GOOGLE_ADS_CHAT_LEAD_LABEL",
    firesOn: "Kaylev saves a lead in the site chat",
  },
  {
    kind: "contact_click",
    label: "Phone / email click",
    envVar: "NEXT_PUBLIC_GOOGLE_ADS_CONTACT_CLICK_LABEL",
    firesOn: "tel: or mailto: link clicked",
  },
];

/** Legacy alias for the consult label. */
export const GOOGLE_ADS_CONVERSION_LABEL = GOOGLE_ADS_LABELS.consult;

/** Google Ads “Book appointment” style event, e.g. ads_conversion_Book_appointment_1 */
export const GOOGLE_ADS_CONVERSION_EVENT = /^ads_conversion_[\w-]+$/.test(
  adsEvent,
)
  ? adsEvent
  : "";

export function googleAdsSendTo(kind: AdsConversionKind = "consult") {
  const label = GOOGLE_ADS_LABELS[kind];
  if (!GOOGLE_ADS_ID || !label) return "";
  return `${GOOGLE_ADS_ID}/${label}`;
}

export function fireAdsConversion(
  kind: AdsConversionKind,
  params: { value?: number; currency?: string; transactionId?: string } = {},
) {
  const sendTo = googleAdsSendTo(kind);
  if (!sendTo || typeof window === "undefined") return false;
  const payload = {
    send_to: sendTo,
    ...(typeof params.value === "number" ? { value: params.value } : {}),
    ...(params.currency ? { currency: params.currency } : {}),
    ...(params.transactionId ? { transaction_id: params.transactionId } : {}),
  };
  // gtag loads afterInteractive, so page-load conversions can run before it exists.
  let attempts = 0;
  const send = () => {
    if (typeof window.gtag === "function") {
      trackEvent("conversion", payload);
      return;
    }
    attempts += 1;
    if (attempts < 20) window.setTimeout(send, 500);
  };
  send();
  return true;
}
