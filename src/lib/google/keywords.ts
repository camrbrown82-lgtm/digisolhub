import { routeAgentModel } from "@/lib/agent/modelRouter";
import { brandVoicePrompt, type CompanyBrand } from "@/lib/branding";
import { createOpenAIClient, getOpenAIApiKey } from "@/lib/openai";
import * as ads from "@/lib/google/adsApi";
import { GoogleApiError } from "@/lib/google/auth";
import * as gsc from "@/lib/google/searchConsole";

/** Google geo target ids. Alberta is the default market for Hub companies. */
export const KEYWORD_AREAS = {
  alberta: { label: "Alberta", geoTargets: ["20113"] },
  canada: { label: "Canada", geoTargets: ["2124"] },
} as const;
export type KeywordArea = keyof typeof KEYWORD_AREAS;

export type TrendingKeyword = {
  text: string;
  monthlySearches: number;
  /** Last 3 months vs the 3 before, in percent. */
  trend: number;
  competition: string;
  lowBid: number;
  highBid: number;
  suggestedBid: number;
  why: string;
  alreadyBidding: boolean;
};

export type AdGroupOption = {
  resourceName: string;
  name: string;
  campaign: string;
  campaignStatus: string;
  manualCpc: boolean;
};

export type CompanyContext = {
  companyName: string;
  brand: CompanyBrand;
  siteUrl: string;
  notes?: string | null;
  published: string;
};

export type KeywordSource = "planner" | "own_searches";

const MIN_SEARCHES = 10;
const MIN_OWN_IMPRESSIONS = 5;
const FALLBACK_BID = 1.5;

async function askKaylev<T>(system: string, user: string, maxTokens: number): Promise<T> {
  const completion = await createOpenAIClient().chat.completions.create({
    model: routeAgentModel("complex"),
    temperature: 0.2,
    max_tokens: maxTokens,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  return JSON.parse(completion.choices[0]?.message?.content || "{}") as T;
}

function companyBrief(ctx: CompanyContext) {
  return [
    brandVoicePrompt(ctx.companyName, ctx.brand, "copy"),
    ctx.siteUrl ? `Website: ${ctx.siteUrl}` : "No website on file.",
    ctx.notes ? `Company notes: ${ctx.notes.slice(0, 800)}` : "",
    ctx.published.slice(0, 3000),
  ]
    .filter(Boolean)
    .join("\n");
}

function trendOf(volumes: { monthlySearches?: string }[] | undefined) {
  const series = (volumes ?? []).map((v) => Number(v.monthlySearches || 0));
  if (series.length < 6) return 0;
  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const recent = avg(series.slice(-3));
  const before = avg(series.slice(-6, -3));
  if (!before) return recent ? 100 : 0;
  return Math.round(((recent - before) / before) * 100);
}

function suggestBid(low: number, high: number, average: number) {
  const base = low && high ? (low + high) / 2 : low || high || average || FALLBACK_BID;
  return Math.max(0.1, Math.round(base * 100) / 100);
}

/** Search ad groups this account can add keywords to, plus keywords it already bids on. */
export async function loadAdGroups(customerId: string) {
  const [groups, existing] = await Promise.all([
    ads.adsSearch<{
      adGroup?: { resourceName?: string; name?: string };
      campaign?: { name?: string; status?: string; biddingStrategyType?: string };
    }>(
      customerId,
      "SELECT ad_group.resource_name, ad_group.name, campaign.name, campaign.status, campaign.bidding_strategy_type FROM ad_group WHERE campaign.advertising_channel_type = 'SEARCH' AND campaign.status IN ('ENABLED', 'PAUSED') AND ad_group.status IN ('ENABLED', 'PAUSED')",
    ),
    ads.adsSearch<{ adGroupCriterion?: { keyword?: { text?: string } } }>(
      customerId,
      "SELECT ad_group_criterion.keyword.text FROM ad_group_criterion WHERE ad_group_criterion.type = 'KEYWORD' AND ad_group_criterion.negative = FALSE AND ad_group_criterion.status != 'REMOVED' AND campaign.status != 'REMOVED'",
    ),
  ]);
  const adGroups: AdGroupOption[] = groups
    .filter((g) => g.adGroup?.resourceName)
    .map((g) => ({
      resourceName: g.adGroup!.resourceName!,
      name: g.adGroup?.name || "Ad group",
      campaign: g.campaign?.name || "Campaign",
      campaignStatus: g.campaign?.status || "",
      manualCpc: g.campaign?.biddingStrategyType === "MANUAL_CPC",
    }));
  const bidding = new Set(
    existing.map((r) => (r.adGroupCriterion?.keyword?.text || "").toLowerCase()).filter(Boolean),
  );
  return { adGroups, bidding };
}

type PoolKeyword = Omit<TrendingKeyword, "why" | "alreadyBidding">;

function edmontonDay(offsetDays: number) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Edmonton",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(Date.now() + offsetDays * 86_400_000));
}

/** This company's own searches: Search Console queries and ad search terms, 4 weeks vs the 4 before. */
async function ownSearchPool(customerId: string, searchConsoleSite: string | null | undefined): Promise<PoolKeyword[]> {
  const now = { startDate: edmontonDay(-30), endDate: edmontonDay(-3) };
  const prev = { startDate: edmontonDay(-58), endDate: edmontonDay(-31) };
  const site = searchConsoleSite?.trim();
  type AdsTerm = { searchTermView?: { searchTerm?: string }; metrics?: { impressions?: string; clicks?: string; costMicros?: string } };
  const termsQuery = (range: typeof now) =>
    `SELECT search_term_view.search_term, metrics.impressions, metrics.clicks, metrics.cost_micros FROM search_term_view WHERE segments.date BETWEEN '${range.startDate}' AND '${range.endDate}'`;
  const [gscNow, gscPrev, adsNow, adsPrev] = await Promise.allSettled([
    site ? gsc.searchAnalytics(site, { ...now, dimensions: ["query"], rowLimit: 1000 }) : Promise.resolve([]),
    site ? gsc.searchAnalytics(site, { ...prev, dimensions: ["query"], rowLimit: 1000 }) : Promise.resolve([]),
    ads.adsSearch<AdsTerm>(customerId, termsQuery(now)),
    ads.adsSearch<AdsTerm>(customerId, termsQuery(prev)),
  ]);

  const rows = new Map<string, { gscNow: number; gscPrev: number; adsNow: number; adsPrev: number; cost: number; clicks: number }>();
  const row = (text: string | undefined) => {
    const key = (text || "").trim().toLowerCase();
    if (!key) return null;
    let hit = rows.get(key);
    if (!hit) {
      hit = { gscNow: 0, gscPrev: 0, adsNow: 0, adsPrev: 0, cost: 0, clicks: 0 };
      rows.set(key, hit);
    }
    return hit;
  };
  if (gscNow.status === "fulfilled") for (const r of gscNow.value) { const h = row(r.keys?.[0]); if (h) h.gscNow += r.impressions; }
  if (gscPrev.status === "fulfilled") for (const r of gscPrev.value) { const h = row(r.keys?.[0]); if (h) h.gscPrev += r.impressions; }
  if (adsNow.status === "fulfilled") {
    for (const r of adsNow.value) {
      const h = row(r.searchTermView?.searchTerm);
      if (!h) continue;
      h.adsNow += Number(r.metrics?.impressions || 0);
      h.clicks += Number(r.metrics?.clicks || 0);
      h.cost += ads.micros(r.metrics?.costMicros);
    }
  }
  if (adsPrev.status === "fulfilled") {
    for (const r of adsPrev.value) { const h = row(r.searchTermView?.searchTerm); if (h) h.adsPrev += Number(r.metrics?.impressions || 0); }
  }

  return Array.from(rows, ([text, r]) => {
    const current = Math.max(r.gscNow, r.adsNow);
    const before = Math.max(r.gscPrev, r.adsPrev);
    const cpc = r.clicks ? r.cost / r.clicks : 0;
    return {
      text,
      monthlySearches: current,
      trend: before ? Math.round(((current - before) / before) * 100) : current ? 100 : 0,
      competition: "",
      lowBid: 0,
      highBid: 0,
      suggestedBid: suggestBid(0, 0, cpc),
    };
  });
}

/**
 * Kaylev seeds Keyword Planner from this company's field, then keeps the rising, buyer-intent terms.
 * Without Basic API access, falls back to this company's own Search Console and ad search data.
 */
export async function findTrendingKeywords(
  customerId: string,
  ctx: CompanyContext,
  area: KeywordArea,
  searchConsoleSite?: string | null,
) {
  if (!getOpenAIApiKey()) throw new Error("Kaylev needs OPENAI_API_KEY to pick keywords.");
  const brief = companyBrief(ctx);
  const where = KEYWORD_AREAS[area].label;

  const seeded = await askKaylev<{ field?: string; seeds?: unknown }>(
    `You are Kaylev, picking Google Ads seed keywords for ${ctx.companyName} only. Return JSON {"field": "the industry in 2-4 words", "seeds": ["..."]}.
Give 8-12 short phrases (1-4 words) a ready-to-buy customer in ${where} types into Google to find what ${ctx.companyName} sells. Mix the core service, specific services, and "near me" or city versions where local. No company names, no competitor brands, no jobs, no DIY or free searches.`,
    brief,
    400,
  );
  const seeds = Array.isArray(seeded.seeds)
    ? seeded.seeds.filter((s): s is string => typeof s === "string" && Boolean(s.trim())).slice(0, 20)
    : [];
  if (!seeds.length && !ctx.siteUrl) throw new Error("Kaylev couldn't tell what this company sells. Fill in the brand kit or add a website.");

  const [planned, account] = await Promise.all([
    ads
      .generateKeywordIdeas(customerId, {
        seeds,
        url: ctx.siteUrl || null,
        geoTargets: [...KEYWORD_AREAS[area].geoTargets],
      })
      .then((ideas) => ({ ideas, locked: false }))
      .catch((error: unknown) => {
        if (error instanceof GoogleApiError && error.adsCode === "DEVELOPER_TOKEN_NOT_APPROVED") {
          return { ideas: [] as ads.KeywordIdeaRow[], locked: true };
        }
        throw error;
      }),
    loadAdGroups(customerId),
  ]);

  const ownName = ctx.companyName.toLowerCase();
  const source: KeywordSource = planned.locked ? "own_searches" : "planner";
  let pool: PoolKeyword[] = planned.locked
    ? await ownSearchPool(customerId, searchConsoleSite)
    : planned.ideas.map((row) => {
        const m = row.keywordIdeaMetrics;
        const low = ads.micros(m?.lowTopOfPageBidMicros);
        const high = ads.micros(m?.highTopOfPageBidMicros);
        return {
          text: (row.text || "").trim(),
          monthlySearches: Number(m?.avgMonthlySearches || 0),
          trend: trendOf(m?.monthlySearchVolumes),
          competition: (m?.competition || "UNKNOWN").toLowerCase(),
          lowBid: Math.round(low * 100) / 100,
          highBid: Math.round(high * 100) / 100,
          suggestedBid: suggestBid(low, high, ads.micros(m?.averageCpcMicros)),
        };
      });
  pool = pool
    .filter(
      (k) =>
        k.text &&
        k.monthlySearches >= (planned.locked ? MIN_OWN_IMPRESSIONS : MIN_SEARCHES) &&
        !k.text.toLowerCase().includes(ownName),
    )
    .sort((a, b) => b.monthlySearches - a.monthlySearches)
    .slice(0, 90);
  if (planned.locked && pool.length < 15) {
    const have = new Set(pool.map((k) => k.text.toLowerCase()));
    pool.push(
      ...seeds
        .filter((s) => !have.has(s.toLowerCase()))
        .map((text) => ({ text, monthlySearches: 0, trend: 0, competition: "", lowBid: 0, highBid: 0, suggestedBid: FALLBACK_BID })),
    );
  }
  const notice = planned.locked
    ? `Google's Keyword Planner is locked until the Hub's Google Ads API access goes from Explorer to Basic. Until then Kaylev ranks searches from ${ctx.companyName}'s own Google data (Search Console and ad search terms, last 4 weeks vs the 4 before) plus his own picks for the field. Numbers are impressions for this company, not all of Google.`
    : "";
  if (!pool.length) {
    return { field: seeded.field || "", seeds, keywords: [] as TrendingKeyword[], adGroups: account.adGroups, source, notice };
  }

  const columns = planned.locked
    ? "impressions for this company in the last 4 weeks (0 = Kaylev's idea, no data yet), trend vs the 4 weeks before"
    : `monthly searches in ${where}, trend last 3 months vs 3 before, competition`;
  const picked = await askKaylev<{ picks?: { text?: unknown; why?: unknown }[] }>(
    `You are Kaylev, choosing Google Ads keywords for ${ctx.companyName} only. From the list, keep up to 15 that a paying customer of this company would search. Prefer rising trend, then volume. Drop competitor or other brand names, job searches, DIY, free, definitions, and anything this company doesn't sell.
Return JSON {"picks": [{"text": "exact keyword from the list", "why": "one short sentence on why it's worth bidding"}]}, best first.`,
    `${brief}\n\nKeywords (${columns}):\n${pool
      .map((k) => `${k.text} | ${k.monthlySearches} | ${k.trend > 0 ? "+" : ""}${k.trend}%${k.competition ? ` | ${k.competition}` : ""}`)
      .join("\n")}`,
    1500,
  );

  const byText = new Map(pool.map((k) => [k.text.toLowerCase(), k]));
  const keywords: TrendingKeyword[] = [];
  for (const pick of picked.picks ?? []) {
    const hit = typeof pick.text === "string" ? byText.get(pick.text.trim().toLowerCase()) : undefined;
    if (!hit || keywords.some((k) => k.text === hit.text)) continue;
    keywords.push({
      ...hit,
      why: typeof pick.why === "string" ? pick.why.slice(0, 200) : "",
      alreadyBidding: account.bidding.has(hit.text.toLowerCase()),
    });
  }
  return { field: seeded.field || "", seeds, keywords, adGroups: account.adGroups, source, notice };
}

const fit = (lines: unknown, max: number, count: number) =>
  (Array.isArray(lines) ? lines : [])
    .filter((l): l is string => typeof l === "string")
    .map((l) => l.replace(/[!]{2,}/g, "!").trim())
    .filter((l) => l && l.length <= max)
    .filter((l, i, all) => all.findIndex((x) => x.toLowerCase() === l.toLowerCase()) === i)
    .slice(0, count);

/** Responsive search ad copy for a new campaign, in this company's voice. */
export async function writeSearchAd(ctx: CompanyContext, keywords: string[]) {
  const written = await askKaylev<{ headlines?: unknown; descriptions?: unknown }>(
    `You are Kaylev, writing one Google responsive search ad for ${ctx.companyName} only. Return JSON {"headlines": [...], "descriptions": [...]}.
10-15 headlines, each 30 characters or fewer. 4 descriptions, each 90 characters or fewer. Use the keywords naturally, the brand voice, and only offers published on this company's site. No exclamation marks in headlines, no ALL CAPS, no phone numbers, no other company's name or offer.`,
    `${companyBrief(ctx)}\n\nKeywords: ${keywords.join(", ")}`,
    900,
  );
  const headlines = fit(written.headlines, 30, 15);
  const descriptions = fit(written.descriptions, 90, 4);
  const spare = [ctx.companyName, ...keywords]
    .map((k) => k.replace(/\b\w/g, (c) => c.toUpperCase()))
    .filter((k) => k.length <= 30 && !headlines.some((h) => h.toLowerCase() === k.toLowerCase()));
  headlines.push(...spare.slice(0, Math.max(0, 3 - headlines.length)));
  if (headlines.length < 3 || descriptions.length < 2) {
    throw new Error("Kaylev couldn't write a full ad. Try again, or add keywords to an existing ad group instead.");
  }
  return { headlines, descriptions };
}
