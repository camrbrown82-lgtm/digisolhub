"use client";

import { useEffect } from "react";
import { googleAdsSendTo } from "@/lib/ads";
import { trackEvent } from "@/lib/analytics";

export function AdsLeadConversion() {
  useEffect(() => {
    const sendTo = googleAdsSendTo();
    if (!sendTo) return;
    trackEvent("conversion", { send_to: sendTo });
    trackEvent("generate_lead", { send_to: sendTo, method: "contact_form" });
  }, []);

  return null;
}
