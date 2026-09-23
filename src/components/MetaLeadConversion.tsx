"use client";

import { useEffect } from "react";
import { trackMetaEvent } from "@/components/MetaPixel";

/** Fire Meta Lead on confirmation — reuses form event_id for Pixel/CAPI dedupe. */
export function MetaLeadConversion() {
  useEffect(() => {
    let eventID: string | undefined;
    try {
      eventID = sessionStorage.getItem("ds_meta_lead_event_id") || undefined;
    } catch {
      eventID = undefined;
    }
    trackMetaEvent(
      "Lead",
      { content_name: "consultation_request" },
      eventID ? { eventID } : undefined,
    );
  }, []);

  return null;
}
