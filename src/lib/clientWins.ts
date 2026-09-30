import type { SupabaseClient } from "@supabase/supabase-js";
import { DIGISOL_HOUSE_NAME } from "@/lib/branding";

const PILOT_NOTE = "Added as a Hub company (free pilot). Counted as a converted client.";

function hostOf(domain: string | null | undefined) {
  return (domain || "").trim().replace(/^https?:\/\//i, "").replace(/^www\./i, "").split("/")[0].toLowerCase();
}

/** The company's sign-up contact: the person on its won lead in DigiSol's pipeline. */
export async function clientSignUpContact(db: SupabaseClient, companyName: string) {
  if (!companyName.trim() || companyName.trim().toLowerCase() === DIGISOL_HOUSE_NAME.toLowerCase()) return null;
  const { data: house } = await db.from("clients").select("id").ilike("name", DIGISOL_HOUSE_NAME).maybeSingle();
  if (!house?.id) return null;
  const { data } = await db
    .from("leads")
    .select("name, email")
    .eq("client_id", house.id)
    .eq("stage", "won")
    .ilike("company", companyName)
    .not("email", "is", null)
    .limit(1);
  const lead = data?.[0];
  return lead?.email ? { email: lead.email as string, name: (lead.name as string | null) ?? null } : null;
}

/**
 * Records a Hub company as a won lead in DigiSol's pipeline, linked to DigiSol's contact for it when
 * one exists. Safe to call repeatedly; one won lead per company. DigiSol itself is never counted.
 */
export async function recordClientWin(db: SupabaseClient, clientId: string, contactId?: string | null) {
  const { data: client } = await db
    .from("clients")
    .select("id, name, domain, created_at")
    .eq("id", clientId)
    .maybeSingle();
  if (!client?.name || client.name.trim().toLowerCase() === DIGISOL_HOUSE_NAME.toLowerCase()) return null;

  const { data: house } = await db.from("clients").select("id").ilike("name", DIGISOL_HOUSE_NAME).maybeSingle();
  if (!house?.id) return null;

  const { data: existing } = await db
    .from("leads")
    .select("id")
    .eq("client_id", house.id)
    .eq("stage", "won")
    .ilike("company", client.name)
    .limit(1);
  const { data: given } = contactId
    ? await db.from("contacts").select("id, name, email, phone").eq("id", contactId).limit(1)
    : { data: null };

  if (existing?.length) {
    const leadId = existing[0].id as string;
    const linked = given?.[0];
    if (linked) {
      await db
        .from("leads")
        .update({ contact_id: linked.id, name: linked.name, email: linked.email, phone: linked.phone })
        .eq("id", leadId);
    }
    return leadId;
  }

  const host = hostOf(client.domain);
  const { data: byCompany } = given?.length
    ? { data: given }
    : await db
        .from("contacts")
        .select("id, name, email, phone")
        .eq("client_id", house.id)
        .ilike("company", client.name)
        .limit(1);
  let contact = byCompany?.[0] ?? null;
  if (!contact && host) {
    const { data: byEmail } = await db
      .from("contacts")
      .select("id, name, email, phone")
      .eq("client_id", house.id)
      .ilike("email", `%@${host}`)
      .limit(1);
    contact = byEmail?.[0] ?? null;
  }

  const closedAt = (client.created_at as string | null) || new Date().toISOString();
  const { data: lead, error } = await db
    .from("leads")
    .insert({
      client_id: house.id,
      contact_id: contact?.id ?? null,
      name: contact?.name ?? null,
      email: contact?.email ?? null,
      phone: contact?.phone ?? null,
      company: client.name,
      service: "Free pilot: Hub + website",
      source: "other",
      channel: "other",
      stage: "won",
      estimated_value: 0,
      actual_value: 0,
      first_touch_at: closedAt,
      last_touch_at: closedAt,
      closed_at: closedAt,
      notes_preview: PILOT_NOTE,
    })
    .select("id")
    .single();
  if (error || !lead) {
    console.warn("[client-win] not recorded", error?.message);
    return null;
  }
  await db.from("lead_activities").insert({
    lead_id: lead.id,
    type: "won",
    body: PILOT_NOTE,
    to_stage: "won",
  });
  return lead.id as string;
}
