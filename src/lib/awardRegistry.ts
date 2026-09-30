import type { SupabaseClient } from "@supabase/supabase-js";
import { DIGISOL_HOUSE_NAME } from "@/lib/branding";
import { ensureWebsiteAwardsSchema } from "@/lib/ensureWebsiteAwardsSchema";
import { DIGISOL_SITE_URL } from "@/lib/site";
import { AWARD_MIN_SCORE, awardEligible, awardLinks, type ProspectAward } from "@/lib/websiteAward";

export const AWARD_CATEGORY = "DigiSol Excellence Award";

export type AwardRow = {
  id: string;
  company_name: string;
  target_url: string;
  audit_score: number;
  award_category: string | null;
  source: "prospect" | "hub";
  prospect_id: string | null;
  audit_id: string | null;
  client_id: string | null;
  contact_id: string | null;
  site_host: string | null;
  sent_to: string | null;
  sent_at: string | null;
  add_page_viewed_at: string | null;
  claimed_at: string | null;
  claimed_from: string | null;
  featured: boolean;
  created_at: string;
};

export function siteHost(url: string | null | undefined) {
  const raw = (url || "").trim();
  if (!raw) return "";
  try {
    return new URL(raw.includes("://") ? raw : `https://${raw}`).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return "";
  }
}

type RecordInput = {
  /** The award id used in /award/<id>: the prospect id or the website_audits id. */
  id: string;
  source: "prospect" | "hub";
  companyName: string;
  url: string;
  score: number;
  prospectId?: string;
  auditId?: string;
  clientId?: string;
  contactId?: string | null;
  sentTo?: string;
  sentAt?: string;
  awardedAt?: string;
};

function rowFor(input: RecordInput) {
  const row: Record<string, unknown> = {
    id: input.id,
    source: input.source,
    company_name: input.companyName,
    target_url: input.url,
    audit_score: input.score,
    award_category: AWARD_CATEGORY,
    site_host: siteHost(input.url),
    badge_image_url: awardLinks(DIGISOL_SITE_URL, input.id).badge,
    prospect_id: input.prospectId ?? null,
    audit_id: input.auditId ?? null,
    client_id: input.clientId ?? null,
  };
  if (input.contactId) row.contact_id = input.contactId;
  if (input.sentTo) row.sent_to = input.sentTo;
  if (input.sentAt) row.sent_at = input.sentAt;
  if (input.awardedAt) row.created_at = input.awardedAt;
  return row;
}

/** Adds the award to the registry, or updates who it was sent to. Never throws. */
export async function recordAward(db: SupabaseClient, input: RecordInput) {
  try {
    await ensureWebsiteAwardsSchema();
    const row = rowFor(input);
    const { data: existing } = await db.from("website_awards").select("id").eq("id", input.id).maybeSingle();
    if (existing) delete row.created_at;
    const { error } = existing
      ? await db.from("website_awards").update(row).eq("id", input.id)
      : await db.from("website_awards").insert(row);
    if (error) throw new Error(error.message);
  } catch (err) {
    console.warn("[awards] record skipped", err instanceof Error ? err.message : err);
  }
}

/**
 * Registers awards that exist but aren't in the table yet: prospects handed one in outreach, and each
 * Hub company's latest 90+ audit of its own site. DigiSol doesn't award itself.
 */
export async function syncAwards(db: SupabaseClient) {
  const schema = await ensureWebsiteAwardsSchema();
  if (!schema.ok) throw new Error(schema.error);
  const { data: rows } = await db.from("website_awards").select("id, client_id");
  const known = new Set((rows ?? []).map((r) => r.id as string));
  const clientsWithAward = new Set((rows ?? []).map((r) => r.client_id as string | null).filter(Boolean));
  const inserts: Record<string, unknown>[] = [];

  const { data: prospects } = await db
    .from("prospects")
    .select("id, business_name, url, contact_id, contact_email, emailed_at, audit_report")
    .not("audit_report->award", "is", null)
    .limit(500);
  for (const p of prospects ?? []) {
    const award = (p.audit_report as { award?: ProspectAward } | null)?.award;
    if (!award || known.has(p.id as string)) continue;
    inserts.push(
      rowFor({
        id: p.id as string,
        source: "prospect",
        companyName: String(p.business_name || "").trim() || siteHost(String(p.url)),
        url: String(p.url),
        score: Number(award.score),
        prospectId: p.id as string,
        contactId: (p.contact_id as string | null) ?? null,
        sentTo: p.emailed_at ? String(p.contact_email || "") || undefined : undefined,
        sentAt: (p.emailed_at as string | null) ?? undefined,
        awardedAt: award.awardedAt,
      }),
    );
  }

  const { data: audits } = await db
    .from("website_audits")
    .select("id, client_id, url, final_url, score, created_at, clients(name, domain)")
    .gte("score", AWARD_MIN_SCORE)
    .order("created_at", { ascending: false })
    .limit(500);
  const latestPerClient = new Set<string>();
  for (const a of audits ?? []) {
    const clientId = a.client_id as string | null;
    const client = (Array.isArray(a.clients) ? a.clients[0] : a.clients) as
      | { name?: string | null; domain?: string | null }
      | null;
    if (!clientId || !client?.name || latestPerClient.has(clientId)) continue;
    if (client.name.trim().toLowerCase() === DIGISOL_HOUSE_NAME.toLowerCase()) continue;
    const row = { score: Number(a.score) || 0, url: String(a.url), final_url: (a.final_url as string | null) ?? null };
    if (!awardEligible(row, client.domain)) continue;
    latestPerClient.add(clientId);
    if (clientsWithAward.has(clientId) || known.has(a.id as string)) continue;
    inserts.push(
      rowFor({
        id: a.id as string,
        source: "hub",
        companyName: client.name,
        url: row.final_url || row.url,
        score: row.score,
        auditId: a.id as string,
        clientId,
        awardedAt: String(a.created_at),
      }),
    );
  }

  if (inserts.length) {
    const { error } = await db.from("website_awards").insert(inserts);
    if (error) throw new Error(error.message);
  }
  return inserts.length;
}

const OWN_HOSTS = /(^|\.)wwwdigisol\.com$|(^|\.)vercel\.app$|^localhost$|^127\.0\.0\.1$|googleusercontent\.com$|mail\./i;

/** First time the badge loads on someone else's site (from the image request's Referer). */
export async function markBadgeSeen(db: SupabaseClient, awardId: string, referer: string | null) {
  const host = siteHost(referer);
  if (!host || OWN_HOSTS.test(host)) return;
  await db
    .from("website_awards")
    .update({ claimed_at: new Date().toISOString(), claimed_from: host, is_claimed: true })
    .eq("id", awardId)
    .is("claimed_at", null)
    .then(
      () => null,
      () => null,
    );
}

/** First time someone opens the "add your badge" page. */
export async function markAddPageViewed(db: SupabaseClient, awardId: string) {
  await db
    .from("website_awards")
    .update({ add_page_viewed_at: new Date().toISOString() })
    .eq("id", awardId)
    .is("add_page_viewed_at", null)
    .then(
      () => null,
      () => null,
    );
}
