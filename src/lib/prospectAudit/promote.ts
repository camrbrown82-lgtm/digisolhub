import type { SupabaseClient } from "@supabase/supabase-js";
import { emitHubEvent } from "@/lib/events";
import { logAgentActivity } from "@/lib/agent/digisol/activityLog";
import { DIGISOL_OPERATOR } from "@/lib/agent/digisol/scope";
import {
  MAIL_SCANNER_TAG,
  SUSPECTED_SCANNER_TAG,
  clearScannerFlags,
  markSuspectedScanner,
} from "@/lib/mailScanner";

/** Opens/clicks faster than this after send are mail security scanners, not people. */
export const SCANNER_WINDOW_MS = 20_000;

export function isScannerEngagement(
  sentAt: string | null | undefined,
  eventAt: string | null | undefined,
) {
  if (!sentAt || !eventAt) return false;
  const gap = new Date(eventAt).getTime() - new Date(sentAt).getTime();
  return Number.isFinite(gap) && gap < SCANNER_WINDOW_MS;
}

/**
 * Scanner-speed engagement on a cold audit prospect marks it a suspected
 * scanner. It is confirmed (and all emails stop) only if no real open or click
 * follows within a day. Real leads (inbound or already promoted) are never flagged.
 */
export async function flagMailScanner(input: {
  db: SupabaseClient;
  contactId?: string | null;
  event: "opened" | "clicked";
  sentAt?: string | null;
  eventAt: string;
}) {
  if (!input.contactId) return false;
  const { data: contact } = await input.db
    .from("contacts")
    .select("id, tags, client_id")
    .eq("id", input.contactId)
    .maybeSingle();
  if (!contact) return false;
  const tags = (contact.tags as string[] | null) ?? [];
  const coldProspect = tags.some((t) => t === "prospect_audit" || t === "cold_prospect");
  const realLead = tags.some((t) => t === "active_lead" || t === "prospect_audit_engaged");
  if (
    !coldProspect ||
    realLead ||
    tags.includes(MAIL_SCANNER_TAG) ||
    tags.includes(SUSPECTED_SCANNER_TAG)
  ) {
    return false;
  }

  await markSuspectedScanner(input.db, {
    contactId: contact.id as string,
    tags,
    event: input.event,
    sentAt: input.sentAt,
    eventAt: input.eventAt,
  });

  if (contact.client_id) {
    await logAgentActivity({
      supabase: input.db,
      clientId: contact.client_id as string,
      action: "prospect_audit:suspected_scanner",
      toolName: "flagMailScanner",
      status: "ok",
      input: { contactId: contact.id, event: input.event, sentAt: input.sentAt, eventAt: input.eventAt },
    });
  }
  return true;
}

/**
 * On an open or click in a prospect-audit send, promote cold prospect → active
 * DigiSol lead and queue follow-up via existing Hub/Inngest workflows.
 * Engagement under 20s after send is ignored as a scanner.
 */
export async function promoteProspectOnEngagement(input: {
  db: SupabaseClient;
  resendId?: string | null;
  contactId?: string | null;
  sendId?: string | null;
  event: "opened" | "clicked";
  eventAt: string;
  sentAt?: string | null;
}) {
  let prospectQuery = input.db
    .from("prospects")
    .select(
      "id, client_id, business_name, contact_email, contact_id, trade, url, promoted_at, engaged_at, emailed_at, audit_summary",
    )
    .limit(1);

  if (input.resendId) {
    prospectQuery = prospectQuery.eq("resend_id", input.resendId);
  } else if (input.contactId) {
    prospectQuery = prospectQuery.eq("contact_id", input.contactId);
  } else {
    return { promoted: false, reason: "missing_keys" as const };
  }

  const { data: prospect } = await prospectQuery.maybeSingle();
  if (!prospect) {
    return { promoted: false, reason: "not_prospect_send" as const };
  }

  const sentAt = input.sentAt || prospect.emailed_at;
  if (isScannerEngagement(sentAt, input.eventAt)) {
    await flagMailScanner({
      db: input.db,
      contactId: prospect.contact_id || input.contactId,
      event: input.event,
      sentAt,
      eventAt: input.eventAt,
    });
    return { promoted: false, reason: "scanner" as const };
  }

  const now = new Date().toISOString();
  const contactId = prospect.contact_id || input.contactId;
  if (!contactId) {
    return { promoted: false, reason: "missing_contact" as const };
  }

  await clearScannerFlags(input.db, contactId);

  const { data: contact } = await input.db
    .from("contacts")
    .select("id, tags, email, name, company, unsubscribed_at")
    .eq("id", contactId)
    .maybeSingle();

  if (!contact || contact.unsubscribed_at) {
    return { promoted: false, reason: "contact_unavailable" as const };
  }

  const tags = Array.from(
    new Set([
      ...((contact.tags as string[] | null) ?? []).filter(
        (tag) => tag !== "cold_prospect",
      ),
      "lead",
      "prospect_audit_engaged",
      "active_lead",
      prospect.trade ? `trade:${prospect.trade}` : "",
    ].filter(Boolean)),
  );

  await input.db
    .from("contacts")
    .update({
      tags,
      source: "prospect_audit_engaged",
      notes_preview: `Engaged with DigiSol prospect audit (${input.event}) · ${prospect.url}`.slice(
        0,
        280,
      ),
      client_id: prospect.client_id,
    })
    .eq("id", contactId);

  await input.db.from("notes").insert({
    contact_id: contactId,
    body: `Prospect engaged (${input.event}). Promoted from cold prospect to active DigiSol lead. Trade: ${prospect.trade}. URL: ${prospect.url}`,
  });

  // Pipeline lead row for DigiSol hub.
  try {
    const { data: existingLead } = await input.db
      .from("leads")
      .select("id")
      .eq("contact_id", contactId)
      .maybeSingle();

    if (!existingLead) {
      const { data: lead } = await input.db
        .from("leads")
        .insert({
          contact_id: contactId,
          client_id: prospect.client_id,
          name: contact.name || prospect.business_name,
          email: contact.email,
          company: contact.company || prospect.business_name,
          service: prospect.trade,
          source: "prospect_audit",
          channel: "email",
          stage: "new",
          notes_preview: (prospect.audit_summary || "").slice(0, 280) || null,
        })
        .select("id")
        .maybeSingle();

      if (lead?.id) {
        await input.db.from("lead_activities").insert({
          lead_id: lead.id,
          type: "created",
          body: `Promoted after prospect-audit email ${input.event}.`,
          to_stage: "new",
        });
      }
    }
  } catch (err) {
    console.warn(
      "[prospect-audit] pipeline promote skipped",
      err instanceof Error ? err.message : err,
    );
  }

  const alreadyPromoted = Boolean(prospect.promoted_at);
  await input.db
    .from("prospects")
    .update({
      engaged_at: prospect.engaged_at || now,
      promoted_at: prospect.promoted_at || now,
      audit_status: "promoted",
      contact_id: contactId,
      metadata: {
        lastEngagement: input.event,
        sendId: input.sendId ?? null,
      },
    })
    .eq("id", prospect.id);

  if (!alreadyPromoted) {
    await emitHubEvent("hub/lead.created", { contactId });
    await emitHubEvent("hub/tag.added", {
      contactId,
      tag: "prospect_audit_engaged",
    });
  }

  if (prospect.client_id) {
    await logAgentActivity({
      supabase: input.db,
      clientId: prospect.client_id,
      action: "prospect_audit:promoted",
      toolName: "promoteProspectOnEngagement",
      status: "ok",
      input: {
        prospectId: prospect.id,
        event: input.event,
        operator: DIGISOL_OPERATOR.name,
      },
      output: { contactId, alreadyPromoted },
    });
  }

  return {
    promoted: !alreadyPromoted,
    alreadyPromoted,
    contactId,
    prospectId: prospect.id,
  };
}
