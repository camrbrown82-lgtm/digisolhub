import type { SupabaseClient } from "@supabase/supabase-js";

/** Website audit score a company's own site needs for the DigiSol Excellence Award. */
export const AWARD_MIN_SCORE = 90;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function hostKey(value: string | null | undefined) {
  const raw = (value || "").trim();
  if (!raw) return "";
  try {
    return new URL(raw.includes("://") ? raw : `https://${raw}`).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return "";
  }
}

/** The award only counts for an audit of the company's own website. */
export function auditIsOwnSite(audit: { url: string; final_url?: string | null }, domain: string | null | undefined) {
  const own = hostKey(domain);
  return Boolean(own && (hostKey(audit.final_url) === own || hostKey(audit.url) === own));
}

export function awardEligible(
  audit: { score: number; url: string; final_url?: string | null },
  domain: string | null | undefined,
) {
  return audit.score >= AWARD_MIN_SCORE && auditIsOwnSite(audit, domain);
}

export function awardLinks(baseUrl: string, auditId: string) {
  const base = baseUrl.replace(/\/$/, "");
  return {
    verify: `${base}/award/${auditId}`,
    add: `${base}/award/${auditId}?add=1`,
    badge: `${base}/award/${auditId}/badge.svg`,
    badgePng: `${base}/award/${auditId}/badge.png`,
  };
}

export function awardEmbedHtml(baseUrl: string, auditId: string, companyName: string, score: number) {
  const { verify, badge } = awardLinks(baseUrl, auditId);
  const alt = `DigiSol Excellence Award: ${companyName} scored ${score}/100 on its website audit`.replace(/"/g, "&quot;");
  return `<a href="${verify}" target="_blank" rel="noopener"><img src="${badge}" alt="${alt}" width="320" height="120" style="border:0"></a>`;
}

export function awardDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "America/Edmonton",
  });
}

export type AwardStatus =
  | { state: "missing" }
  | {
      state: "valid" | "not_eligible" | "superseded";
      auditId: string;
      companyName: string;
      site: string;
      score: number;
      auditedAt: string;
      /** Newer audit of the same site, when there is one. */
      latest: { score: number; auditedAt: string } | null;
      /** DigiSol's own site. Shown as "we pass our own audit", never as the Excellence Award. */
      house?: boolean;
    };

/** Public id for DigiSol's own badge; always resolves to the newest audit of wwwdigisol.com. */
export const HOUSE_AWARD_ID = "digisol";

/** Wording per badge, so DigiSol's self-audit never claims the award it gives others. */
export function badgeText(award: { companyName: string; house?: boolean }) {
  return award.house
    ? { pill: "DIGISOL WEBSITE AUDIT", title: "We pass our own audit", scoreLabel: "Our site" }
    : { pill: "DIGISOL EXCELLENCE AWARD", title: award.companyName, scoreLabel: "Website audit" };
}

async function loadHouseAudit(db: SupabaseClient): Promise<AwardStatus> {
  const { data: client } = await db
    .from("clients")
    .select("id, name, domain")
    .ilike("name", "DigiSol")
    .maybeSingle();
  if (!client?.id) return { state: "missing" };
  const { data: audits } = await db
    .from("website_audits")
    .select("id, url, final_url, score, created_at")
    .eq("client_id", client.id)
    .order("created_at", { ascending: false })
    .limit(20);
  const latest = (audits ?? []).find((a) =>
    auditIsOwnSite({ url: String(a.url), final_url: a.final_url as string | null }, client.domain),
  );
  if (!latest) return { state: "missing" };
  const score = Number(latest.score) || 0;
  const auditedAt = String(latest.created_at);
  return {
    state: score >= AWARD_MIN_SCORE ? "valid" : "superseded",
    auditId: HOUSE_AWARD_ID,
    companyName: String(client.name),
    site: hostKey(String(latest.final_url || latest.url)),
    score,
    auditedAt,
    latest: score >= AWARD_MIN_SCORE ? null : { score, auditedAt },
    house: true,
  };
}

/** Snapshot saved on a prospect's `audit_report` when the outreach email hands it the award. */
export type ProspectAward = { score: number; awardedAt: string };

async function loadProspectAward(db: SupabaseClient, id: string): Promise<AwardStatus> {
  const { data: prospect } = await db
    .from("prospects")
    .select("id, business_name, url, audit_score, last_audited_at, audit_report")
    .eq("id", id)
    .maybeSingle();
  const award = (prospect?.audit_report as { award?: ProspectAward } | null)?.award;
  if (!prospect || !award || !(Number(award.score) >= AWARD_MIN_SCORE)) return { state: "missing" };

  const site = hostKey(String(prospect.url));
  const reaudited =
    prospect.last_audited_at && new Date(String(prospect.last_audited_at)) > new Date(award.awardedAt);
  const latest = reaudited
    ? { score: Number(prospect.audit_score) || 0, auditedAt: String(prospect.last_audited_at) }
    : null;
  return {
    state: latest && latest.score < AWARD_MIN_SCORE ? "superseded" : "valid",
    auditId: String(prospect.id),
    companyName: String(prospect.business_name || "").trim() || site,
    site,
    score: Number(award.score),
    auditedAt: award.awardedAt,
    latest,
  };
}

/**
 * Looks up an award by id and checks it against the latest audit of the same site. Hub companies are
 * keyed by `website_audits.id`; audited prospects by `prospects.id`.
 */
export async function loadAward(db: SupabaseClient, auditId: string): Promise<AwardStatus> {
  if (auditId === HOUSE_AWARD_ID) return loadHouseAudit(db);
  if (!UUID.test(auditId)) return { state: "missing" };
  const { data: audit } = await db
    .from("website_audits")
    .select("id, client_id, url, final_url, score, created_at, clients(name, domain)")
    .eq("id", auditId)
    .maybeSingle();
  if (!audit) return loadProspectAward(db, auditId);
  if (!audit.client_id) return { state: "missing" };
  const client = (Array.isArray(audit.clients) ? audit.clients[0] : audit.clients) as
    | { name?: string | null; domain?: string | null }
    | null;
  if (!client?.name) return { state: "missing" };

  const row = {
    score: Number(audit.score) || 0,
    url: String(audit.url),
    final_url: (audit.final_url as string | null) ?? null,
  };
  const base = {
    auditId: String(audit.id),
    companyName: client.name,
    site: hostKey(row.final_url || row.url),
    score: row.score,
    auditedAt: String(audit.created_at),
  };
  if (!awardEligible(row, client.domain)) return { state: "not_eligible", ...base, latest: null };

  const { data: newer } = await db
    .from("website_audits")
    .select("id, url, final_url, score, created_at")
    .eq("client_id", audit.client_id)
    .gt("created_at", audit.created_at)
    .order("created_at", { ascending: false })
    .limit(20);
  const latestOwn = (newer ?? []).find((a) =>
    auditIsOwnSite({ url: String(a.url), final_url: a.final_url as string | null }, client.domain),
  );
  const latest = latestOwn
    ? { score: Number(latestOwn.score) || 0, auditedAt: String(latestOwn.created_at) }
    : null;
  return {
    state: latest && latest.score < AWARD_MIN_SCORE ? "superseded" : "valid",
    ...base,
    latest,
    house: client.name.trim().toLowerCase() === "digisol",
  };
}
