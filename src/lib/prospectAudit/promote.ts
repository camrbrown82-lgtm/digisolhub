import type { SupabaseClient } from "@supabase/supabase-js";
import { emitHubEvent } from "@/lib/events";
import { logAgentActivity } from "@/lib/agent/digisol/activityLog";
import { DIGISOL_OPERATOR } from "@/lib/agent/digisol/scope";

/**
 * On open/click of a prospect-audit send, promote cold prospect → active DigiSol lead
 * and queue follow-up via existing Hub/Inngest workflows.
 */
export async function promoteProspectOnEngagement(input: {
  db: SupabaseClient;
  resendId?: string | null;
  contactId?: string | null;
  sendId?: string | null;
  event: "opened" | "clicked";
}) {
  let prospectQuery = input.db
    .from("prospects")
    .select(
      "id, client_id, business_name, contact_email, contact_id, trade, url, promoted_at, engaged_at, audit_summary",
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

  const now = new Date().toISOString();
  const contactId = prospect.contact_id || input.contactId;
  if (!contactId) {
    return { promoted: false, reason: "missing_contact" as const };
  }

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
