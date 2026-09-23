"use client";

import { useEffect } from "react";
import { trackMetaEvent } from "@/components/MetaPixel";

/** Fire Meta Lead on the confirmation thank-you page. */
export function MetaLeadConversion() {
  useEffect(() => {
    trackMetaEvent("Lead", { content_name: "consultation_request" });
  }, []);

  return null;
}
