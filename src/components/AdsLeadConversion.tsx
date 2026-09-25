"use client";

import { useEffect } from "react";
import {
  GOOGLE_ADS_CONVERSION_EVENT,
  googleAdsSendTo,
} from "@/lib/ads";
import { trackEvent } from "@/lib/analytics";

/**
 * Fires Google Ads conversion on the consult confirmation page (page load).
 * Supports classic send_to (AW-ID/label) and the newer named event from Ads setup
 * (e.g. ads_conversion_Book_appointment_1).
 */
export function AdsLeadConversion() {
  useEffect(() => {
    const sendTo = googleAdsSendTo();
    if (sendTo) {
      trackEvent("conversion", { send_to: sendTo });
      trackEvent("generate_lead", {
        send_to: sendTo,
        method: "contact_form",
      });
    }
    if (GOOGLE_ADS_CONVERSION_EVENT) {
      trackEvent(GOOGLE_ADS_CONVERSION_EVENT, {
        method: "contact_form",
      });
    }
  }, []);

  return null;
}
