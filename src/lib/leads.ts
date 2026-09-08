import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import { emitHubEvent } from "@/lib/events";
import { findOrCreateClient } from "@/lib/workspace";

export type LeadPayload = {
  name?: string | null;
  email?: string | null;
  company?: string | null;
  domain?: string | null;
  phone?: string | null;
  service?: string | null;
  message?: string | null;
  source?: string | null;
  tags?: string[] | null;
};

function parseCompanyDomain(raw?: string | null) {
  const value = (raw ?? "").trim();
  if (!value) return { company: null as string | null, domain: null as string | null };
  const parts = value.split(/[—–-]/).map((part) => part.trim());
  if (parts.length >= 2 && parts[1].includes(".")) {
    return { company: parts[0], domain: parts[1].replace(/^https?:\/\//, "") };
  }
  if (value.includes(".") && !value.includes(" ")) {
    return { company: value, domain: value.replace(/^https?:\/\//, "") };
  }
  return { company: value, domain: null as string | null };
}

export function normalizeLead(body: Record<string, unknown>): LeadPayload {
  const nested =
    body.data && typeof body.data === "object"
      ? (body.data as Record<string, unknown>)
      : body;
  const email = String(nested.email ?? nested.Email ?? "").trim();
  const name = String(nested.name ?? nested.fullName ?? nested.full_name ?? "").trim();
  const business = String(
    nested.company ?? nested.business ?? nested.business_name ?? "",
  ).trim();
  const parsed = parseCompanyDomain(business);
  return {
    name: name || null,
    email: email || null,
    company: parsed.company,
    domain: String(nested.domain ?? parsed.domain ?? "").trim() || parsed.domain,
    phone: String(nested.phone ?? "").trim() || null,
    service: String(nested.service ?? "").trim() || null,
    message: String(nested.message ?? nested.details ?? nested.project_details ?? "").trim() || null,
    source: String(nested.source ?? body.from_name ?? "web3forms").trim() || "web3forms",
    tags: Array.isArray(nested.tags) ? (nested.tags as string[]) : ["lead"],
  };
}

export async function upsertLead(payload: LeadPayload) {
  if (!hasAdminClient()) {
    throw new Error("Supabase service role is not configured");
  }
  const email = payload.email?.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    throw new Error("A valid email is required");
  }

  const admin = createAdminClient();
  const clientId = await findOrCreateClient(admin, {
    name: payload.company,
    domain: payload.domain,
  });

  const { data: existing } = await admin
    .from("contacts")
    .select("id, tags")
    .ilike("email", email)
    .maybeSingle();

  const tags = Array.from(
    new Set([...(existing?.tags ?? []), ...(payload.tags ?? ["lead"])]),
  );

  const row = {
    name: payload.name,
    email,
    company: payload.company,
    domain: payload.domain,
    phone: payload.phone,
    service: payload.service,
    source: payload.source ?? "web3forms",
    tags,
    notes_preview: payload.message?.slice(0, 280) ?? null,
    client_id: clientId,
  };

  let contactId = existing?.id as string | undefined;

  if (existing) {
    const { error } = await admin.from("contacts").update(row).eq("id", existing.id);
    if (error) throw error;
  } else {
    const { data, error } = await admin.from("contacts").insert(row).select("id").single();
    if (error) throw error;
    contactId = data.id;
  }

  if (payload.message && contactId) {
    await admin.from("notes").insert({
      contact_id: contactId,
      body: payload.message,
    });
  }

  if (contactId && !existing) {
    await emitHubEvent("hub/lead.created", { contactId });
  }

  return { id: contactId, created: !existing };
}
