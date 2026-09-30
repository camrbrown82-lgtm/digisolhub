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
    };

/** Looks up an award by audit id and checks it against the company's latest audit of its own site. */
export async function loadAward(db: SupabaseClient, auditId: string): Promise<AwardStatus> {
  if (!UUID.test(auditId)) return { state: "missing" };
  const { data: audit } = await db
    .from("website_audits")
    .select("id, client_id, url, final_url, score, created_at, clients(name, domain)")
    .eq("id", auditId)
    .maybeSingle();
  if (!audit?.client_id) return { state: "missing" };
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
  };
}
