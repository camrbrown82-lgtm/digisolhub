import type { SupabaseClient } from "@supabase/supabase-js";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { getOpenAIApiKey } from "@/lib/openai";
import { logAgentActivity } from "@/lib/agent/digisol/activityLog";
import { evaluateCaslPublishedContact } from "@/lib/prospectAudit/casl";
import {
  normalizeProspectUrl,
  prospectHostKey,
} from "@/lib/prospectAudit/seedCatalog";

/** Trades are searched first; other sectors once every trade/city pair is done. */
export const DISCOVERY_TRADE_SECTORS = [
  "hvac",
  "plumbing",
  "electrical",
  "roofing",
  "landscaping",
  "construction",
  "cleaning",
  "auto",
] as const;

export const DISCOVERY_OTHER_SECTORS = [
  "dental",
  "legal",
  "accounting",
  "salon",
  "fitness",
  "realestate",
  "photography",
  "healthcare",
  "restaurant",
  "retail",
  "professional",
] as const;

export const DISCOVERY_CITIES = [
  "Calgary",
  "Edmonton",
  "Airdrie",
  "Red Deer",
  "Lethbridge",
  "Cochrane",
  "Okotoks",
  "Chestermere",
  "St. Albert",
  "Sherwood Park",
  "Medicine Hat",
  "Grande Prairie",
  "Spruce Grove",
  "Leduc",
  "Canmore",
] as const;

const SECTOR_LABELS: Record<string, string> = {
  hvac: "heating and air conditioning (HVAC)",
  plumbing: "plumbing",
  electrical: "electrician",
  roofing: "roofing",
  landscaping: "landscaping",
  construction: "home renovation / general contractor",
  cleaning: "cleaning service",
  auto: "auto repair shop",
  dental: "dental clinic",
  legal: "law firm",
  accounting: "accounting / bookkeeping firm",
  salon: "hair salon / spa",
  fitness: "gym / fitness studio",
  realestate: "independent real estate agent or brokerage",
  photography: "photographer",
  healthcare: "physiotherapy / chiropractic / massage clinic",
  restaurant: "independent restaurant or cafe",
  retail: "independent retail shop",
  professional: "local professional services firm",
};

const BLOCKED_DOMAINS = [
  "yelp.com",
  "yelp.ca",
  "homestars.com",
  "yellowpages.ca",
  "canada411.ca",
  "facebook.com",
  "instagram.com",
  "linkedin.com",
  "google.com",
  "bbb.org",
  "houzz.com",
  "angi.com",
  "thumbtack.com",
  "kijiji.ca",
  "tripadvisor.ca",
  "tripadvisor.com",
  "opentable.ca",
  "ratemds.com",
  "threebestrated.ca",
  "wikipedia.org",
  "reddit.com",
  "alberta.ca",
  "calgary.ca",
  "edmonton.ca",
];

const CHAIN_HOST_HINTS =
  /enercare|reliancehomecomfort|mrrooter|mrelectric|mrsparky|benjaminfranklin|onehour|servicemaster|molly ?maid|jiffylube|midas|kaltire|canadiantire|remax\.ca|royallepage|century21|goodlife|anytimefitness|firstchoice|greatclips|tim ?hortons|mcdonalds|walmart|homedepot|rona\.ca|mnp\.ca|kpmg|deloitte/i;

const DISCOVERY_ACTION = "prospect_discovery:search";

export const PROSPECT_DISCOVERY_MODEL =
  process.env.OPENAI_PROSPECT_DISCOVERY_MODEL?.trim() || "gpt-4.1-mini";

export type DiscoveredProspect = {
  businessName: string;
  url: string;
  trade: string;
  city: string;
  email: string;
};

export type DiscoveryResult = {
  searches: Array<{ sector: string; city: string; found: number; kept: number }>;
  prospects: DiscoveredProspect[];
  tier: "trades" | "other" | "requested";
};

function comboKey(sector: string, city: string) {
  return `${sector}|${city}`;
}

function orderedCombos(
  sectors: readonly string[],
  cities: readonly string[] = DISCOVERY_CITIES,
) {
  const combos: Array<{ sector: string; city: string }> = [];
  for (const city of cities) {
    for (const sector of sectors) combos.push({ sector, city });
  }
  return combos;
}

async function lastSearchedAt(db: SupabaseClient, clientId: string) {
  const { data } = await db
    .from("agent_activity_logs")
    .select("input, created_at")
    .eq("client_id", clientId)
    .eq("action", DISCOVERY_ACTION)
    .eq("status", "ok")
    .order("created_at", { ascending: false })
    .limit(1000);
  const map = new Map<string, number>();
  for (const row of data ?? []) {
    const input = (row.input || {}) as { sector?: string; city?: string };
    if (!input.sector || !input.city) continue;
    const key = comboKey(input.sector, input.city);
    if (!map.has(key)) map.set(key, new Date(String(row.created_at)).getTime());
  }
  return map;
}

/**
 * Next sector/city pairs to search. Unsearched trade pairs come first; other
 * sectors start only once every trade pair has been searched at least once.
 * After that, the least recently searched pairs cycle back in.
 */
function pickCombos(
  searched: Map<string, number>,
  count: number,
  requestedSectors?: string[],
  requestedCities?: string[],
) {
  const byAge = (list: Array<{ sector: string; city: string }>) =>
    list
      .map((combo, index) => ({
        combo,
        index,
        at: searched.get(comboKey(combo.sector, combo.city)) ?? 0,
      }))
      .sort((a, b) => a.at - b.at || a.index - b.index)
      .map((entry) => entry.combo);

  if (requestedSectors?.length || requestedCities?.length) {
    const sectors = requestedSectors?.length
      ? requestedSectors
      : [...DISCOVERY_TRADE_SECTORS, ...DISCOVERY_OTHER_SECTORS];
    return {
      tier: "requested" as const,
      combos: byAge(orderedCombos(sectors, requestedCities)).slice(0, count),
    };
  }

  const trades = orderedCombos(DISCOVERY_TRADE_SECTORS);
  const tradesLeft = trades.filter(
    (c) => !searched.has(comboKey(c.sector, c.city)),
  );
  if (tradesLeft.length > 0) {
    return { tier: "trades" as const, combos: tradesLeft.slice(0, count) };
  }
  const others = orderedCombos(DISCOVERY_OTHER_SECTORS);
  const othersLeft = others.filter(
    (c) => !searched.has(comboKey(c.sector, c.city)),
  );
  if (othersLeft.length > 0) {
    return { tier: "other" as const, combos: othersLeft.slice(0, count) };
  }
  return {
    tier: "trades" as const,
    combos: byAge([...trades, ...others]).slice(0, count),
  };
}

function parseBusinesses(text: string) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return [];
  try {
    const parsed = JSON.parse(match[0]) as {
      businesses?: Array<{ name?: string; url?: string; city?: string }>;
    };
    return (parsed.businesses ?? []).filter(
      (b) => typeof b.url === "string" && typeof b.name === "string",
    );
  } catch {
    return [];
  }
}

function isBlockedHost(host: string) {
  if (!host || !host.includes(".")) return true;
  if (BLOCKED_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`))) {
    return true;
  }
  return CHAIN_HOST_HINTS.test(host);
}

async function fetchHomepage(url: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "DigiSolHubBot/1.0 (+https://wwwdigisol.com; website-audit)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok) return null;
    return { html: await res.text(), finalUrl: res.url || url };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function searchCombo(input: {
  sector: string;
  city: string;
  usedHosts: Set<string>;
  apiKey: string;
}) {
  const openai = createOpenAI({ apiKey: input.apiKey });
  const label = SECTOR_LABELS[input.sector] || input.sector;
  const avoid = Array.from(input.usedHosts).slice(-150).join(", ");

  const result = await generateText({
    model: openai.responses(PROSPECT_DISCOVERY_MODEL),
    tools: {
      web_search: openai.tools.webSearch({
        searchContextSize: "low",
        userLocation: {
          type: "approximate",
          country: "CA",
          region: "Alberta",
          city: input.city,
        },
      }),
    },
    maxOutputTokens: 1500,
    prompt: `Search the web for independent, locally owned ${label} businesses in ${input.city}, Alberta, Canada.

Rules:
- Each must have its own business website (not a directory, social profile, or marketplace listing).
- Prefer businesses whose website publicly shows a contact email address.
- Exclude national chains, franchises, big-box stores, news sites, and government sites.
- Skip these domains, they are already known: ${avoid || "(none)"}
- Return up to 10 businesses. Only include URLs you actually saw in search results.

Reply with only JSON in this shape:
{"businesses":[{"name":"Business Name","url":"https://example.ca/","city":"${input.city}"}]}`,
  });

  return parseBusinesses(result.text);
}

/**
 * Find new Alberta SMB prospects with OpenAI web search. Only keeps sites that
 * load and publish a CASL-eligible email on the homepage, so audit slots are
 * not spent on businesses that could never be emailed.
 */
export async function discoverProspects(
  db: SupabaseClient,
  clientId: string,
  opts: {
    usedHosts: Set<string>;
    want: number;
    maxSearches?: number;
    sectors?: string[];
    cities?: string[];
  },
): Promise<DiscoveryResult> {
  const apiKey = getOpenAIApiKey();
  const empty: DiscoveryResult = { searches: [], prospects: [], tier: "trades" };
  if (!apiKey || opts.want <= 0) return empty;

  const searched = await lastSearchedAt(db, clientId);
  const { tier, combos } = pickCombos(
    searched,
    Math.max(1, opts.maxSearches ?? 3),
    opts.sectors?.map((s) => s.toLowerCase()),
    opts.cities?.map((c) => c.trim()).filter(Boolean),
  );

  const result: DiscoveryResult = { searches: [], prospects: [], tier };

  for (const combo of combos) {
    if (result.prospects.length >= opts.want) break;

    let found: Array<{ name?: string; url?: string; city?: string }> = [];
    let errorMessage: string | null = null;
    try {
      found = await searchCombo({ ...combo, usedHosts: opts.usedHosts, apiKey });
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : "search failed";
    }

    const fresh = found
      .map((b) => {
        const raw = String(b.url).trim();
        const url = normalizeProspectUrl(raw.startsWith("http") ? raw : `https://${raw}`);
        return { name: String(b.name).trim(), url, host: prospectHostKey(url) };
      })
      .filter((b) => {
        if (!b.name || isBlockedHost(b.host) || opts.usedHosts.has(b.host)) {
          return false;
        }
        opts.usedHosts.add(b.host);
        return true;
      });

    const checked = await Promise.all(
      fresh.map(async (b) => {
        const page = await fetchHomepage(b.url);
        if (!page) return null;
        const casl = evaluateCaslPublishedContact(page.html, page.finalUrl);
        if (!casl.eligible || !casl.email) return null;
        return {
          businessName: b.name.slice(0, 160),
          url: b.url,
          trade: combo.sector,
          city: combo.city,
          email: casl.email,
        } satisfies DiscoveredProspect;
      }),
    );
    const kept = checked.filter((p): p is DiscoveredProspect => p !== null);
    result.prospects.push(...kept);
    result.searches.push({ ...combo, found: found.length, kept: kept.length });

    await logAgentActivity({
      supabase: db,
      clientId,
      action: DISCOVERY_ACTION,
      toolName: "discoverProspects",
      status: errorMessage ? "error" : "ok",
      model: PROSPECT_DISCOVERY_MODEL,
      input: { sector: combo.sector, city: combo.city, tier },
      output: {
        found: found.length,
        fresh: fresh.length,
        kept: kept.map((p) => p.url),
      },
      errorMessage,
    });
  }

  return result;
}
