import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureWebsiteAwardsSchema } from "@/lib/ensureWebsiteAwardsSchema";
import { DIGISOL_SITE_URL } from "@/lib/site";
import { AWARD_MIN_SCORE, awardLinks, type ProspectAward } from "@/lib/websiteAward";

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
  help_emailed_at?: string | null;
  live_emailed_at?: string | null;
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
 * Registers free-audit awards that exist but aren't in the table yet: prospect outreach and
 * visitor-chat audits scoring 90+. Hub audits of a signed-up company are not the Excellence Award.
 */
export async function syncAwards(db: SupabaseClient) {
  const schema = await ensureWebsiteAwardsSchema();
  if (!schema.ok) throw new Error(schema.error);
  const { data: rows } = await db.from("website_awards").select("id");
  const known = new Set((rows ?? []).map((r) => r.id as string));
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

  const { data: chats } = await db
    .from("website_audits")
    .select("id, url, final_url, score, created_at, client_id, raw")
    .gte("score", AWARD_MIN_SCORE)
    .order("created_at", { ascending: false })
    .limit(200);
  for (const audit of chats ?? []) {
    const raw = audit.raw as { source?: string; companyName?: string } | null;
    if (raw?.source !== "visitor_chat" || known.has(audit.id as string)) continue;
    const url = String(audit.final_url || audit.url || "");
    const host = siteHost(url);
    if (!host || OWN_HOSTS.test(host)) continue;
    known.add(audit.id as string);
    inserts.push(
      rowFor({
        id: audit.id as string,
        source: "hub",
        companyName: String(raw.companyName || "").trim() || host,
        url,
        score: Number(audit.score),
        auditId: audit.id as string,
        clientId: (audit.client_id as string | null) ?? undefined,
        awardedAt: String(audit.created_at),
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
