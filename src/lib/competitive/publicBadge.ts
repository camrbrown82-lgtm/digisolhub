import type { SupabaseClient } from "@supabase/supabase-js";
import { DIGISOL_HOUSE_NAME } from "@/lib/branding";
import { companyBadgesUnlocked } from "@/lib/clientWins";
import { competitiveAwards, type CompetitiveAwardKey } from "@/lib/competitive/awards";
import type { SiteSnapshot } from "@/lib/competitive/schema";
import type { StoredCompetitiveReport } from "@/lib/competitive/scoring";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import { DIGISOL_SITE_URL, isDigisolSiteUrl } from "@/lib/site";
import { awardDate } from "@/lib/websiteAward";

const KEYS: CompetitiveAwardKey[] = ["site", "social", "gbp", "leader"];

/** Short line on the badge image. The full title stays on the verification page. */
const BADGE_LINE: Record<CompetitiveAwardKey, string> = {
  site: "Speed, security & SEO",
  social: "Social & content",
  gbp: "Google Business",
  leader: "Industry leader",
};

export function isCompetitiveBadgeKey(value: string): value is CompetitiveAwardKey {
  return (KEYS as string[]).includes(value);
}

export function competitiveBadgeLine(key: CompetitiveAwardKey) {
  return BADGE_LINE[key];
}

export type PublicCompetitiveBadge = {
  analysisId: string;
  key: CompetitiveAwardKey;
  title: string;
  covers: string;
  detail: string;
  companyName: string;
  score: number;
  earnedAt: string;
};

export function competitiveBadgeLinks(baseUrl: string, analysisId: string, key: CompetitiveAwardKey) {
  const base = baseUrl.replace(/\/$/, "");
  const root = `${base}/award/c/${analysisId}/${key}`;
  return {
    verify: root,
    add: `${root}?add=1`,
    badge: `${root}/badge.svg`,
    badgePng: `${root}/badge.png`,
    download: `${root}/badge.png?download=1`,
  };
}

/** Code a winner pastes on their own site. The image is hosted here and links back to the check page. */
export function competitiveBadgeEmbedHtml(
  baseUrl: string,
  badge: Pick<PublicCompetitiveBadge, "analysisId" | "key" | "companyName" | "title" | "score">,
) {
  const { verify, badge: src } = competitiveBadgeLinks(baseUrl, badge.analysisId, badge.key);
  const alt = `DigiSol award: ${badge.companyName}, ${badge.title}, ${badge.score}/100`.replace(/"/g, "&quot;");
  return `<a href="${verify}" target="_blank" rel="noopener"><img src="${src}" alt="${alt}" width="320" height="120" style="border:0"></a>`;
}

type ClientJoin = { name?: string | null } | { name?: string | null }[] | null;

/** An earned, unlocked competitive badge. Null when the analysis, award, or sign-up is missing. */
export async function loadPublicCompetitiveBadge(
  db: SupabaseClient,
  analysisId: string,
  key: string,
): Promise<PublicCompetitiveBadge | null> {
  if (!isCompetitiveBadgeKey(key)) return null;
  const { data } = await db
    .from("competitive_analyses")
    .select("id, status, inputs, result, sources, completed_at, clients(name)")
    .eq("id", analysisId)
    .maybeSingle();
  if (!data || data.status !== "completed" || !data.result) return null;

  const report = data.result as StoredCompetitiveReport;
  const award = competitiveAwards(report).find((item) => item.key === key && item.earned && item.score != null);
  if (!award || award.score == null) return null;

  const inputs = (data.inputs ?? {}) as { companyName?: string; url?: string };
  const sources = (data.sources ?? {}) as { company?: SiteSnapshot };
  const client = data.clients as ClientJoin;
  const clientName = Array.isArray(client) ? client[0]?.name : client?.name;
  const companyName = inputs.companyName || sources.company?.name || clientName || "";
  if (!companyName) return null;
  const analyzedUrl = inputs.url || sources.company?.url || "";
  const digisolOwnSite = isDigisolOwnAnalysis(companyName, analyzedUrl);
  if (!digisolOwnSite && !(await companyBadgesUnlocked(db, [companyName, clientName]))) return null;

  return {
    analysisId,
    key,
    title: award.title,
    covers: award.covers,
    detail: award.detail,
    companyName,
    score: Math.round(award.score),
    earnedAt: (data.completed_at as string | null) || new Date().toISOString(),
  };
}

function isDigisolOwnAnalysis(companyName: string, url: string) {
  const house = companyName.trim().toLowerCase() === DIGISOL_HOUSE_NAME.toLowerCase();
  const withProtocol = url.trim() ? (/^https?:\/\//i.test(url) ? url : `https://${url}`) : "";
  const site = withProtocol ? isDigisolSiteUrl(withProtocol) : false;
  if (withProtocol && !site) return false;
  if (companyName.trim() && !house) return false;
  return house || site;
}

/** Badges DigiSol's own site has earned, newest completed analysis first. */
export async function loadDigisolEarnedBadges(): Promise<PublicCompetitiveBadge[]> {
  if (!hasAdminClient()) return [];
  const db = createAdminClient();
  const { data: house } = await db.from("clients").select("id").ilike("name", DIGISOL_HOUSE_NAME).maybeSingle();
  if (!house?.id) return [];
  const { data: rows } = await db
    .from("competitive_analyses")
    .select("id, inputs, result, sources, completed_at")
    .eq("client_id", house.id)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(20);

  for (const row of rows ?? []) {
    const inputs = (row.inputs ?? {}) as { companyName?: string; url?: string };
    const sources = (row.sources ?? {}) as { company?: SiteSnapshot };
    const companyName = inputs.companyName || sources.company?.name || "";
    const analyzedUrl = inputs.url || sources.company?.url || "";
    if (!isDigisolOwnAnalysis(companyName, analyzedUrl)) continue;
    const report = row.result as StoredCompetitiveReport;
    const earnedAt = (row.completed_at as string | null) || new Date().toISOString();
    return competitiveAwards(report)
      .filter((award) => award.earned && award.score != null)
      .map((award) => ({
        analysisId: row.id as string,
        key: award.key,
        title: award.title,
        covers: award.covers,
        detail: award.detail,
        companyName,
        score: Math.round(award.score as number),
        earnedAt,
      }));
  }
  return [];
}

export function competitiveBadgeDate(iso: string) {
  return awardDate(iso);
}

export function competitiveBadgeFileName(key: CompetitiveAwardKey) {
  return `digisol-${key}-award.png`;
}

export const COMPETITIVE_BADGE_SITE = DIGISOL_SITE_URL;
