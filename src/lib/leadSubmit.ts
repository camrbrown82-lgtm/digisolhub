"use client";

import { trackMetaEvent } from "@/components/MetaPixel";
import { trackEvent } from "@/lib/analytics";
import { getAttributionForSubmit, newMetaEventId } from "@/lib/attributionClient";

export type LeadFields = {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  service?: string;
  message?: string;
  /** Site language the visitor used (`en`, `fr`). */
  language?: string;
  /** Honeypot value; must stay empty. */
  website_url?: string;
};

/**
 * Posts a public lead to /api/contact and fires GA4 + Meta Lead events.
 * Returns "sent" (go to /confirmation) or "spam" (thank quietly, no conversion).
 */
export async function submitLead(fields: LeadFields, method: string) {
  const eventId = newMetaEventId();
  const response = await fetch("/api/contact", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...fields,
      event_id: eventId,
      event_source_url: window.location.href,
      attribution: getAttributionForSubmit(),
    }),
  });
  const result = (await response.json().catch(() => ({}))) as {
    spam?: boolean;
    error?: string;
    eventId?: string;
  };
  if (!response.ok) throw new Error(result.error || "Could not send the request.");
  if (result.spam) return "spam" as const;

  const dedupeId = result.eventId || eventId;
  try {
    sessionStorage.setItem("ds_meta_lead_event_id", dedupeId);
  } catch {
    // ignore
  }
  trackEvent("generate_lead", { method, service: fields.service ?? "" });
  trackMetaEvent(
    "Lead",
    { content_name: "consultation_request", content_category: fields.service ?? "" },
    { eventID: dedupeId },
  );
  return "sent" as const;
}
