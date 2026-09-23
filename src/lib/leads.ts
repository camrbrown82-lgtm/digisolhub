import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import { emitHubEvent } from "@/lib/events";
import {
  ensureDigisolClient,
  findOrCreateClient,
} from "@/lib/workspace";
import {
  attributionTags,
  emptyAttribution,
  parseAttributionFromBody,
  type AttributionPayload,
} from "@/lib/meta/attribution";
import { ensureMetaSchema } from "@/lib/ensureMetaSchema";

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
  attribution?: AttributionPayload;
  metaEventId?: string | null;
  /** Public website/chat leads must stay on DigiSol house workspace. */
  pinHouseClient?: boolean;
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
  const attribution = parseAttributionFromBody(body);
  const metaEventId =
    typeof nested.event_id === "string"
      ? nested.event_id.trim()
      : typeof nested.eventId === "string"
        ? nested.eventId.trim()
        : typeof body.event_id === "string"
          ? body.event_id.trim()
          : null;

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
    attribution,
    metaEventId,
    pinHouseClient:
      nested.pin_house_client === true ||
      nested.pinHouseClient === true ||
      body.pin_house_client === true,
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

  await ensureMetaSchema().catch(() => null);

  const admin = createAdminClient();
  const clientId = payload.pinHouseClient
    ? (await ensureDigisolClient(admin)) || null
    : await findOrCreateClient(admin, {
        name: payload.company,
        domain: payload.domain,
      });

  const { data: existing } = await admin
    .from("contacts")
    .select("id, tags, campaign_channel, utm_campaign, source")
    .ilike("email", email)
    .maybeSingle();

  const attr = payload.attribution || emptyAttribution();
  const tags = Array.from(
    new Set([
      ...(existing?.tags ?? []),
      ...(payload.tags ?? ["lead"]),
      ...attributionTags(attr),
    ]),
  );

  const fromFacebook =
    attr.campaign_channel === "facebook" ||
    attr.campaign_channel === "instagram" ||
    Boolean(attr.fbclid);

  const row: Record<string, unknown> = {
    name: payload.name,
    email,
    company: payload.company,
    domain: payload.domain,
    phone: payload.phone,
    service: payload.service,
    source: fromFacebook
      ? payload.source === "web3forms"
        ? "facebook"
        : payload.source ?? "facebook"
      : payload.source ?? "web3forms",
    tags,
    notes_preview: payload.message?.slice(0, 280) ?? null,
    client_id: clientId,
  };

  // First-touch attribution: only fill empty contact fields.
  if (attr.campaign_channel && !existing?.campaign_channel) {
    row.campaign_channel = attr.campaign_channel;
  }
  if (attr.ab_variant) row.ab_variant = attr.ab_variant;
  if (attr.utm_source) row.utm_source = attr.utm_source;
  if (attr.utm_medium) row.utm_medium = attr.utm_medium;
  if (attr.utm_campaign && !existing?.utm_campaign) {
    row.utm_campaign = attr.utm_campaign;
  }
  if (attr.utm_content) row.utm_content = attr.utm_content;
  if (attr.utm_term) row.utm_term = attr.utm_term;
  if (attr.fbclid) row.fbclid = attr.fbclid;
  if (attr.fbp) row.fbp = attr.fbp;
  if (attr.fbc) row.fbc = attr.fbc;
  if (attr.landing_path) row.landing_path = attr.landing_path;
  if (payload.metaEventId) row.meta_event_id = payload.metaEventId;

  let contactId = existing?.id as string | undefined;

  if (existing) {
    const { error } = await admin.from("contacts").update(row).eq("id", existing.id);
    if (error) {
      // Older DBs without attribution columns — retry core fields only.
      if (/column|schema cache/i.test(error.message)) {
        const {
          utm_source: _u1,
          utm_medium: _u2,
          utm_campaign: _u3,
          utm_content: _u4,
          utm_term: _u5,
          fbclid: _f1,
          fbp: _f2,
          fbc: _f3,
          landing_path: _l,
          meta_event_id: _m,
          ...core
        } = row;
        const { error: retryError } = await admin
          .from("contacts")
          .update(core)
          .eq("id", existing.id);
        if (retryError) throw retryError;
      } else {
        throw error;
      }
    }
  } else {
    const { data, error } = await admin.from("contacts").insert(row).select("id").single();
    if (error) {
      if (/column|schema cache/i.test(error.message)) {
        const {
          utm_source: _u1,
          utm_medium: _u2,
          utm_campaign: _u3,
          utm_content: _u4,
          utm_term: _u5,
          fbclid: _f1,
          fbp: _f2,
          fbc: _f3,
          landing_path: _l,
          meta_event_id: _m,
          ...core
        } = row;
        const { data: retryData, error: retryError } = await admin
          .from("contacts")
          .insert(core)
          .select("id")
          .single();
        if (retryError) throw retryError;
        contactId = retryData.id;
      } else {
        throw error;
      }
    } else {
      contactId = data.id;
    }
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

  if (contactId) {
    try {
      const { data: existingLead } = await admin
        .from("leads")
        .select("id")
        .eq("contact_id", contactId)
        .maybeSingle();

      if (!existingLead) {
        const { data: pipelineLead } = await admin
          .from("leads")
          .insert({
            contact_id: contactId,
            client_id: clientId,
            name: payload.name,
            email,
            phone: payload.phone,
            company: payload.company,
            service: payload.service,
            source: fromFacebook ? "facebook" : "website",
            channel: fromFacebook ? "facebook" : "web",
            stage: "new",
            notes_preview: payload.message?.slice(0, 280) ?? null,
          })
          .select("id")
          .maybeSingle();

        if (pipelineLead?.id) {
          await admin.from("lead_activities").insert({
            lead_id: pipelineLead.id,
            type: "created",
            body: payload.message || "Website inquiry.",
            to_stage: "new",
          });
        }
      }
    } catch (error) {
      console.error("Lead pipeline ingest skipped", error);
    }
  }

  return {
    id: contactId,
    created: !existing,
    attribution: attr,
    fromFacebook,
  };
}
