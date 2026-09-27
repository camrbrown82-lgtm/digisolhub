"use client";

import { useEffect } from "react";
import { GOOGLE_ADS_CONVERSION_EVENT, fireAdsConversion } from "@/lib/ads";
import { trackEvent } from "@/lib/analytics";

/**
 * Fires Google Ads conversion on the consult confirmation page (page load).
 * Supports classic send_to (AW-ID/label) and the newer named event from Ads setup
 * (e.g. ads_conversion_Book_appointment_1).
 */
export function AdsLeadConversion() {
  useEffect(() => {
    fireAdsConversion("consult");
    trackEvent("generate_lead", { method: "contact_form" });
    if (GOOGLE_ADS_CONVERSION_EVENT) {
      trackEvent(GOOGLE_ADS_CONVERSION_EVENT, {
        method: "contact_form",
      });
    }
  }, []);

  return null;
}

/** Stripe success page: paid amount + session id so reloads don't double count. */
export function AdsPurchaseConversion({
  value,
  currency,
  transactionId,
}: {
  value: number;
  currency: string;
  transactionId: string;
}) {
  useEffect(() => {
    fireAdsConversion("purchase", { value, currency, transactionId });
    trackEvent("purchase", { value, currency, transaction_id: transactionId });
  }, [value, currency, transactionId]);

  return null;
}

/** Counts tel: / mailto: clicks anywhere on the public site. */
export function AdsContactClickTracker() {
  useEffect(() => {
    function onClick(event: MouseEvent) {
      const target = event.target as Element | null;
      const link = target?.closest?.("a[href^='tel:'], a[href^='mailto:']");
      if (!link) return;
      const href = link.getAttribute("href") || "";
      fireAdsConversion("contact_click");
      trackEvent("contact_click", { method: href.startsWith("tel:") ? "phone" : "email" });
    }
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  return null;
}
