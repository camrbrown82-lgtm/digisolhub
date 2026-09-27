import type { SupabaseClient } from "@supabase/supabase-js";
import {
  classifyContact,
  CONTACT_AUDIENCE_SECTIONS,
  type ContactAudienceId,
} from "@/lib/contactAudiences";
import {
  ALBERTA_PROSPECT_SEED,
  normalizeProspectUrl,
  prospectHostKey,
  type ProspectSeed,
} from "@/lib/prospectAudit/seedCatalog";

const TRADE_SLUGS = new Set([
  "hvac",
  "plumbing",
  "electrical",
  "roofing",
  "mechanical",
  "heating",
  "cooling",
  "furnace",
]);

export type ChatProspectItem = {
  kind?: "audit" | "lead";
  businessName?: string;
  url?: string | null;
  email?: string | null;
  trade?: string | null;
  city?: string | null;
  source?: string | null;
};

export type EnqueueFromChatResult = {
  added: {
    name: string;
    section: string;
    queuedAudit: boolean;
    url: string | null;
  }[];
  skipped: string[];
  needsWebsite: string[];
};

function slugTrade(value: string | null | undefined) {
  const slug = (value || "general")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  return slug || "general";
}

function isTradeSlug(trade: string) {
  return TRADE_SLUGS.has(trade) || /plumb|electr|hvac|roof|furnace|heat|cool|mechanic/.test(trade);
}

function sectionLabel(id: ContactAudienceId) {
  return CONTACT_AUDIENCE_SECTIONS.find((section) => section.id === id)?.label || id;
}

function queueEmail(host: string) {
  const slug = host.replace(/[^a-z0-9]+/gi, ".").replace(/^\.|\.$/g, "").slice(0, 48);
  return `queued.${slug || "prospect"}@prospects.invalid`;
}

function looksLikeEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && !value.endsWith("@prospects.invalid");
}

function matchSeed(name: string, city?: string | null): ProspectSeed | null {
  const n = name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  if (n.length < 4) return null;
  const cityNorm = city?.trim().toLowerCase();
  return (
    ALBERTA_PROSPECT_SEED.find((seed) => {
      if (cityNorm && seed.city.toLowerCase() !== cityNorm) return false;
      const s = seed.businessName.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
      return s.includes(n) || n.includes(s);
    }) || null
  );
}

export function catalogSeeds(input: {
  trade?: string | null;
  city?: string | null;
  limit?: number;
  usedHosts: Set<string>;
}): ProspectSeed[] {
  const trade = slugTrade(input.trade || "");
  const city = input.city?.trim().toLowerCase();
  const limit = Math.min(10, Math.max(1, input.limit || 5));
  return ALBERTA_PROSPECT_SEED.filter((seed) => {
    const host = prospectHostKey(seed.url);
    if (!host || input.usedHosts.has(host)) return false;
    if (trade !== "general" && seed.trade !== trade) return false;
    if (city && seed.city.toLowerCase() !== city) return false;
    return true;
  }).slice(0, limit);
}

export async function enqueueFromChat(
  db: SupabaseClient,
  clientId: string,
  items: ChatProspectItem[],
): Promise<EnqueueFromChatResult> {
  const { data: existingProspects } = await db
    .from("prospects")
    .select("url")
    .eq("client_id", clientId)
    .limit(2000);
  const usedHosts = new Set(
    (existingProspects ?? []).map((row) => prospectHostKey(String(row.url || ""))),
  );

  const added: EnqueueFromChatResult["added"] = [];
  const skipped: string[] = [];
  const needsWebsite: string[] = [];

  for (const raw of items.slice(0, 15)) {
    const kind = raw.kind === "lead" ? "lead" : "audit";
    const seed = raw.businessName ? matchSeed(raw.businessName, raw.city) : null;
    const urlRaw = (raw.url || seed?.url || "").trim();
    const businessName = (raw.businessName || seed?.businessName || "").trim();
    const trade = slugTrade(raw.trade || seed?.trade || "general");
    const city = (raw.city || seed?.city || "").trim() || null;
    const givenEmail = (raw.email || "").trim().toLowerCase();
    const email = looksLikeEmail(givenEmail) ? givenEmail : "";

    if (!businessName && !urlRaw) continue;

    let url: string | null = null;
    let host = "";
    if (urlRaw) {
      try {
        url = normalizeProspectUrl(urlRaw.startsWith("http") ? urlRaw : `https://${urlRaw}`);
        host = prospectHostKey(url);
      } catch {
        url = null;
      }
    }

    if (kind === "audit" && !url) {
      needsWebsite.push(businessName || "that business");
    }

    const name = businessName || host;
    const tradeTag = isTradeSlug(trade);
    const leadSource =
      raw.source === "facebook" || raw.source === "form" || raw.source === "website"
        ? raw.source
        : "form";
    const tags =
      kind === "lead"
        ? ["lead", "new_lead"]
        : tradeTag
          ? ["prospect_audit", "cold_prospect", `trade:${trade}`]
          : ["prospect_audit", "cold_prospect"];
    const source = kind === "lead" ? leadSource : "prospect_audit";
    const contactEmail = email || (host ? queueEmail(host) : queueEmail(name || "prospect"));
    const placeholder = contactEmail.endsWith("@prospects.invalid");

    const { data: existingContact } = await db
      .from("contacts")
      .select("id, tags")
      .ilike("email", contactEmail)
      .maybeSingle();

    let contactId = existingContact?.id as string | undefined;
    const mergedTags = Array.from(
      new Set([
        ...((existingContact?.tags as string[] | null) ?? []),
        ...tags,
      ]),
    );

    if (contactId) {
      await db
        .from("contacts")
        .update({
          name,
          company: name,
          service: trade,
          source,
          tags: mergedTags,
          client_id: clientId,
          ...(placeholder ? { unsubscribed_at: new Date().toISOString() } : {}),
        })
        .eq("id", contactId);
    } else {
      const { data: created, error } = await db
        .from("contacts")
        .insert({
          name,
          email: contactEmail,
          company: name,
          domain: host || null,
          service: trade,
          source,
          tags,
          client_id: clientId,
          ...(placeholder ? { unsubscribed_at: new Date().toISOString() } : {}),
        })
        .select("id")
        .single();
      if (error || !created) {
        skipped.push(`${name}: ${error?.message || "could not save contact"}`);
        continue;
      }
      contactId = created.id as string;
    }

    let queuedAudit = false;
    if (kind === "audit" && url && host) {
      if (usedHosts.has(host)) {
        skipped.push(`${name} is already in the audit queue`);
        const { data: row } = await db
          .from("prospects")
          .select("id")
          .eq("client_id", clientId)
          .ilike("url", `%${host}%`)
          .limit(1)
          .maybeSingle();
        if (row?.id && contactId) {
          await db
            .from("prospects")
            .update({
              contact_id: contactId,
              business_name: name,
              trade,
              city,
              ...(email ? { contact_email: email } : {}),
            })
            .eq("id", row.id);
        }
      } else {
        const { error } = await db.from("prospects").insert({
          client_id: clientId,
          business_name: name,
          url,
          trade,
          city,
          region: "AB",
          contact_email: email || null,
          contact_id: contactId,
          audit_status: "pending",
          casl_status: "pending",
          metadata: {
            seededFrom: "kaylev_chat",
            seededAt: new Date().toISOString(),
          },
        });
        if (error) {
          skipped.push(`${name}: ${error.message}`);
        } else {
          usedHosts.add(host);
          queuedAudit = true;
        }
      }
    }

    const section = sectionLabel(
      classifyContact({
        email: contactEmail,
        tags: mergedTags.length ? mergedTags : tags,
        source,
        service: trade,
        company: name,
      }),
    );
    added.push({ name, section, queuedAudit, url });
  }

  return { added, skipped, needsWebsite };
}
