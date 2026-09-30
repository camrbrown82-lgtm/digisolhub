import { BetaAnalyticsDataClient, type protos } from "@google-analytics/data";
import type { SupabaseClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import { LOCATION_PAGES } from "@/lib/locations";

export const GA_RANGES = [7, 14, 28, 90] as const;

export function gaRange(input?: string | string[] | null) {
  const n = Number(Array.isArray(input) ? input[0] : input);
  return (GA_RANGES as readonly number[]).includes(n) ? n : 14;
}

class UncachedResult<R> extends Error {
  constructor(readonly result: R) {
    super("GA4 result not cached");
  }
}

/** Caches GA4 reports for 10 minutes. Results with an error are returned but never cached. */
function cacheGa<A extends (string | number)[], R extends { error?: string }>(
  key: string,
  fn: (...args: A) => Promise<R>,
) {
  const cached = unstable_cache(
    async (...args: A) => {
      const result = await fn(...args);
      if (result.error) throw new UncachedResult(result);
      return result;
    },
    ["ga4", key],
    { revalidate: 600, tags: ["ga4"] },
  );
  return async (...args: A): Promise<R> => {
    try {
      return await cached(...args);
    } catch (error) {
      if (error instanceof UncachedResult) return error.result as R;
      return fn(...args);
    }
  };
}

export type Ga4Summary = {
  configured: boolean;
  error?: string;
  sessions: number;
  users: number;
  pageviews: number;
  daily: { day: string; sessions: number }[];
  pages: { label: string; pageviews: number }[];
  locations: { label: string; pageviews: number }[];
  sources: { label: string; sessions: number }[];
  googleAds: {
    sessions: number;
    campaigns: { label: string; sessions: number }[];
  };
};

function lastDays(count: number) {
  const days: string[] = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i -= 1) {
    const date = new Date(now);
    date.setUTCDate(now.getUTCDate() - i);
    days.push(date.toISOString().slice(0, 10));
  }
  return days;
}

function emptySummary(partial?: Partial<Ga4Summary>): Ga4Summary {
  return {
    configured: false,
    sessions: 0,
    users: 0,
    pageviews: 0,
    daily: lastDays(14).map((day) => ({ day, sessions: 0 })),
    pages: [],
    locations: [],
    sources: [],
    googleAds: { sessions: 0, campaigns: [] },
    ...partial,
  };
}

function readPrivateKey() {
  const raw =
    process.env.GA4_PRIVATE_KEY?.trim() ||
    process.env.GOOGLE_PRIVATE_KEY?.trim() ||
    "";
  if (!raw) return "";
  return raw.replace(/\\n/g, "\n");
}

/** The company's GA4 property from Google setup. Only DigiSol falls back to the env property. */
export async function companyGa4PropertyId(
  db: SupabaseClient,
  clientId: string | null | undefined,
  isDigisol: boolean,
) {
  let saved = "";
  if (clientId) {
    const { data } = await db
      .from("google_setups")
      .select("ga4_property_id")
      .eq("client_id", clientId)
      .maybeSingle();
    saved = String(data?.ga4_property_id || "").replace(/\D/g, "");
  }
  return saved || (isDigisol ? ga4ConfigStatus().propertyId : "");
}

/** DigiSol's own property (env). Other companies use their Google setup property via `ga4StatusFor`. */
export function ga4ConfigStatus() {
  return ga4StatusFor((process.env.GA4_PROPERTY_ID || "").trim());
}

export function ga4StatusFor(propertyId: string | null | undefined) {
  const id = (propertyId || "").replace(/\D/g, "");
  const clientEmail = (
    process.env.GA4_CLIENT_EMAIL ||
    process.env.GOOGLE_CLIENT_EMAIL ||
    ""
  ).trim();
  const privateKey = readPrivateKey();
  return {
    propertyId: id,
    clientEmail,
    ready: Boolean(id && clientEmail && privateKey),
  };
}

const UNNAMED_CAMPAIGN = /^\((not set|direct|referral|organic|cross-network)\)$/i;

function summarizeGoogleAds(
  rows: {
    dimensionValues?: ({ value?: string | null } | null)[] | null;
    metricValues?: ({ value?: string | null } | null)[] | null;
  }[],
) {
  const campaigns: { label: string; sessions: number }[] = [];
  let sessions = 0;
  for (const row of rows) {
    const count = metricInt(row);
    sessions += count;
    const label = row.dimensionValues?.[0]?.value?.trim() || "";
    if (!label || UNNAMED_CAMPAIGN.test(label)) continue;
    campaigns.push({ label, sessions: count });
  }
  return { sessions, campaigns };
}

function metricInt(
  row:
    | {
        metricValues?:
          | ({ value?: string | null } | null)[]
          | null;
      }
    | null
    | undefined,
  index = 0,
) {
  return Number(row?.metricValues?.[index]?.value ?? 0) || 0;
}

export type DemographicRow = { label: string; users: number; adsUsers: number };

export type Ga4Demographics = {
  configured: boolean;
  error?: string;
  age: DemographicRow[];
  gender: DemographicRow[];
  cities: DemographicRow[];
  devices: DemographicRow[];
  /** Google withholds age and gender until enough people visit. */
  ageGenderWithheld: boolean;
};

export function emptyGa4Demographics(partial?: Partial<Ga4Demographics>): Ga4Demographics {
  return {
    configured: false,
    age: [],
    gender: [],
    cities: [],
    devices: [],
    ageGenderWithheld: false,
    ...partial,
  };
}

/** Age and gender only combine with user-scoped fields, so they filter on first source. */
function googleAdsFilter(scope: "session" | "firstUser") {
  return {
    andGroup: {
      expressions: [
        {
          filter: {
            fieldName: `${scope}Source`,
            stringFilter: { matchType: "EXACT" as const, value: "google", caseSensitive: false },
          },
        },
        {
          filter: {
            fieldName: `${scope}Medium`,
            stringFilter: { matchType: "EXACT" as const, value: "cpc", caseSensitive: false },
          },
        },
      ],
    },
  };
}

export type Ga4ContentTestRow = {
  campaign: string;
  content: string;
  source: string;
  medium: string;
  sessions: number;
  engagedSessions: number;
  keyEvents: number;
};

/** Sessions per utm_campaign + utm_content + source/medium for A/B test tracking links. */
export async function fetchGa4ContentTestStats(
  campaigns: string[],
  days = 90,
): Promise<{ configured: boolean; error?: string; rows: Ga4ContentTestRow[] }> {
  const { propertyId, clientEmail, ready } = ga4ConfigStatus();
  if (!ready) return { configured: false, rows: [] };
  if (campaigns.length === 0) return { configured: true, rows: [] };
  try {
    const client = new BetaAnalyticsDataClient({
      credentials: { client_email: clientEmail, private_key: readPrivateKey() },
    });
    const [report] = await Promise.race([
      client.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate: `${days - 1}daysAgo`, endDate: "today" }],
        dimensions: [
          { name: "sessionCampaignName" },
          { name: "sessionManualAdContent" },
          { name: "sessionSource" },
          { name: "sessionMedium" },
        ],
        metrics: [{ name: "sessions" }, { name: "engagedSessions" }, { name: "keyEvents" }],
        dimensionFilter: {
          filter: {
            fieldName: "sessionCampaignName",
            inListFilter: { values: campaigns, caseSensitive: false },
          },
        },
        limit: 500,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Google Analytics timed out")), 6000),
      ),
    ]);
    return {
      configured: true,
      rows: (report.rows ?? []).map((row) => ({
        campaign: (row.dimensionValues?.[0]?.value || "").toLowerCase(),
        content: (row.dimensionValues?.[1]?.value || "").toLowerCase(),
        source: (row.dimensionValues?.[2]?.value || "").toLowerCase(),
        medium: (row.dimensionValues?.[3]?.value || "").toLowerCase(),
        sessions: metricInt(row, 0),
        engagedSessions: metricInt(row, 1),
        keyEvents: metricInt(row, 2),
      })),
    };
  } catch (error) {
    return {
      configured: true,
      error: error instanceof Error ? error.message : "Could not load Google Analytics",
      rows: [],
    };
  }
}

export function fetchDigisolGa4Demographics(days = 28) {
  return fetchGa4Demographics(ga4ConfigStatus().propertyId, days);
}

/** Who visits a company's site: all visitors next to Google Ads visitors, by age, gender, city, device. */
export async function fetchGa4Demographics(
  propertyIdInput: string | null | undefined,
  days = 28,
): Promise<Ga4Demographics> {
  const { propertyId, clientEmail, ready } = ga4StatusFor(propertyIdInput);
  if (!ready) return emptyGa4Demographics();
  return cachedDemographics(propertyId, clientEmail, days);
}

const cachedDemographics = cacheGa("demographics", fetchGa4DemographicsInner);

async function fetchGa4DemographicsInner(
  propertyId: string,
  clientEmail: string,
  days: number,
): Promise<Ga4Demographics> {
  try {
    const client = new BetaAnalyticsDataClient({
      credentials: { client_email: clientEmail, private_key: readPrivateKey() },
    });
    const property = `properties/${propertyId}`;
    const dateRanges = [{ startDate: `${days - 1}daysAgo`, endDate: "today" }];
    const dimensions = ["userAgeBracket", "userGender", "city", "deviceCategory"];
    const userScoped = new Set(["userAgeBracket", "userGender"]);

    const reports = await Promise.allSettled(
      dimensions.flatMap((name) =>
        [false, true].map((adsOnly) =>
          client.runReport({
            property,
            dateRanges,
            dimensions: [{ name }],
            metrics: [{ name: "activeUsers" }],
            ...(adsOnly
              ? { dimensionFilter: googleAdsFilter(userScoped.has(name) ? "firstUser" : "session") }
              : {}),
            orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
            limit: name === "city" ? 10 : 12,
          }),
        ),
      ),
    );
    const failed = reports.find(
      (result): result is PromiseRejectedResult => result.status === "rejected",
    );
    if (failed && reports.every((result) => result.status === "rejected")) {
      throw failed.reason;
    }
    const rowsOf = (index: number) => {
      const result = reports[index];
      return result.status === "fulfilled" ? result.value[0]?.rows ?? [] : [];
    };

    const merge = (index: number): DemographicRow[] => {
      const rows = new Map<string, DemographicRow>();
      for (const row of rowsOf(index * 2)) {
        const label = row.dimensionValues?.[0]?.value || "unknown";
        rows.set(label, { label, users: metricInt(row), adsUsers: 0 });
      }
      for (const row of rowsOf(index * 2 + 1)) {
        const label = row.dimensionValues?.[0]?.value || "unknown";
        const current = rows.get(label) ?? { label, users: 0, adsUsers: 0 };
        current.adsUsers = metricInt(row);
        rows.set(label, current);
      }
      return Array.from(rows.values()).sort((a, b) => b.users - a.users);
    };

    const withheld = (index: number) => {
      const result = reports[index];
      return (
        result.status === "fulfilled" &&
        (result.value[0]?.rows ?? []).length === 0 &&
        Boolean(result.value[0]?.metadata?.subjectToThresholding)
      );
    };

    return {
      configured: true,
      age: merge(0),
      gender: merge(1),
      cities: merge(2),
      devices: merge(3),
      ageGenderWithheld: withheld(0) || withheld(2),
    };
  } catch (error) {
    return emptyGa4Demographics({
      configured: true,
      error: error instanceof Error ? error.message : "Could not load demographics",
    });
  }
}

export function fetchDigisolGa4Summary(days = 14) {
  return fetchGa4Summary(ga4ConfigStatus().propertyId, days);
}

export async function fetchGa4Summary(
  propertyIdInput: string | null | undefined,
  days = 14,
): Promise<Ga4Summary> {
  const { propertyId, clientEmail, ready } = ga4StatusFor(propertyIdInput);
  if (!ready) {
    return emptySummary({
      configured: false,
      error: propertyId
        ? "Add GA4_CLIENT_EMAIL and GA4_PRIVATE_KEY on Vercel to pull live Google Analytics into this page."
        : "No GA4 property is connected for this company. Pick one in Google setup.",
    });
  }

  const GA4_TIMEOUT_MS = 6000;

  try {
    const summary = await Promise.race([
      cachedSummary(propertyId, clientEmail, days),
      new Promise<Ga4Summary>((resolve) =>
        setTimeout(
          () =>
            resolve(
              emptySummary({
                configured: true,
                error:
                  "Google Analytics timed out — try refreshing. First-party website stats below still load.",
              }),
            ),
          GA4_TIMEOUT_MS,
        ),
      ),
    ]);
    return summary;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not load Google Analytics";
    return emptySummary({
      configured: true,
      error: message,
    });
  }
}

const cachedSummary = cacheGa("summary", fetchDigisolGa4SummaryInner);

async function fetchDigisolGa4SummaryInner(
  propertyId: string,
  clientEmail: string,
  days: number,
): Promise<Ga4Summary> {
  try {
    const client = new BetaAnalyticsDataClient({
      credentials: {
        client_email: clientEmail,
        private_key: readPrivateKey(),
      },
    });
    const property = `properties/${propertyId}`;
    const startDate = `${days - 1}daysAgo`;
    const endDate = "today";
    const locationFilter = {
      filter: {
        fieldName: "pagePath",
        stringFilter: {
          matchType: "BEGINS_WITH" as const,
          value: "/locations/",
        },
      },
    };

    const [totalsRes, dailyRes, pagesRes, locationsRes, sourcesRes, adsRes] =
      await Promise.all([
        client.runReport({
          property,
          dateRanges: [{ startDate, endDate }],
          metrics: [
            { name: "sessions" },
            { name: "totalUsers" },
            { name: "screenPageViews" },
          ],
        }),
        client.runReport({
          property,
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: "date" }],
          metrics: [{ name: "sessions" }],
          orderBys: [{ dimension: { dimensionName: "date" } }],
        }),
        client.runReport({
          property,
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: "pagePath" }],
          metrics: [{ name: "screenPageViews" }],
          orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
          limit: 10,
        }),
        client.runReport({
          property,
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: "pagePath" }],
          metrics: [{ name: "screenPageViews" }],
          dimensionFilter: locationFilter,
          orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
          limit: 20,
        }),
        client.runReport({
          property,
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: "sessionSource" }, { name: "sessionMedium" }],
          metrics: [{ name: "sessions" }],
          orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
          limit: 8,
        }),
        client.runReport({
          property,
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: "sessionCampaignName" }],
          metrics: [{ name: "sessions" }],
          dimensionFilter: {
            andGroup: {
              expressions: [
                {
                  filter: {
                    fieldName: "sessionSource",
                    stringFilter: {
                      matchType: "EXACT",
                      value: "google",
                      caseSensitive: false,
                    },
                  },
                },
                {
                  filter: {
                    fieldName: "sessionMedium",
                    stringFilter: {
                      matchType: "EXACT",
                      value: "cpc",
                      caseSensitive: false,
                    },
                  },
                },
              ],
            },
          },
          orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
          limit: 12,
        }),
      ]);

    const totals = totalsRes[0]?.rows?.[0];
    const byDay = new Map(lastDays(days).map((day) => [day, 0]));
    for (const row of dailyRes[0]?.rows ?? []) {
      const raw = row.dimensionValues?.[0]?.value ?? "";
      if (raw.length !== 8) continue;
      const day = `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
      if (byDay.has(day)) byDay.set(day, metricInt(row));
    }

    const locationNameByPath = new Map(
      LOCATION_PAGES.map((page) => [`/locations/${page.slug}`, page.name]),
    );
    const locationCounts = new Map<string, number>();
    for (const row of locationsRes[0]?.rows ?? []) {
      const path = row.dimensionValues?.[0]?.value ?? "";
      const base = path.replace(/\/$/, "") || path;
      const label =
        locationNameByPath.get(base) ||
        LOCATION_PAGES.find((page) => base.startsWith(`/locations/${page.slug}`))
          ?.name ||
        base;
      locationCounts.set(label, (locationCounts.get(label) ?? 0) + metricInt(row));
    }

    return {
      configured: true,
      sessions: metricInt(totals, 0),
      users: metricInt(totals, 1),
      pageviews: metricInt(totals, 2),
      daily: lastDays(days).map((day) => ({
        day,
        sessions: byDay.get(day) ?? 0,
      })),
      pages: (pagesRes[0]?.rows ?? []).map((row) => ({
        label: row.dimensionValues?.[0]?.value || "/",
        pageviews: metricInt(row),
      })),
      locations: Array.from(locationCounts.entries())
        .map(([label, pageviews]) => ({ label, pageviews }))
        .sort((a, b) => b.pageviews - a.pageviews),
      sources: (sourcesRes[0]?.rows ?? []).map((row) => ({
        label: `${row.dimensionValues?.[0]?.value || "(not set)"} / ${row.dimensionValues?.[1]?.value || "(not set)"}`,
        sessions: metricInt(row),
      })),
      googleAds: summarizeGoogleAds(adsRes[0]?.rows ?? []),
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not load Google Analytics";
    return emptySummary({
      configured: true,
      error: message,
    });
  }
}

/** Site events that count as conversions. Several names can roll into one row. */
export const GA4_CONVERSION_EVENTS: { label: string; names: string[] }[] = [
  { label: "Leads", names: ["generate_lead"] },
  { label: "Purchases", names: ["purchase"] },
  { label: "Checkout clicks", names: ["pricing_checkout_click"] },
  { label: "Phone and email clicks", names: ["contact_click"] },
  { label: "Contact option clicks", names: ["contact_option_click"] },
  { label: "Call-to-action clicks", names: ["cta_click"] },
  { label: "Newsletter signups", names: ["dispatch_subscribe"] },
  { label: "Shares and downloads", names: ["share_export", "media_export", "dispatch_export"] },
  { label: "Map clicks", names: ["map_click"] },
  { label: "City page views", names: ["location_page_view"] },
];

const LEAD_EVENT = "generate_lead";

export type Ga4Change = { current: number; previous: number };

export type Ga4Insights = {
  configured: boolean;
  error?: string;
  days: number;
  totals: {
    sessions: Ga4Change;
    users: Ga4Change;
    pageviews: Ga4Change;
    engagementRate: Ga4Change;
    avgSessionSeconds: Ga4Change;
    leads: Ga4Change;
  };
  conversions: ({ label: string } & Ga4Change)[];
  /** Null when the `method` custom dimension isn't registered in GA4. */
  leadMethods: { label: string; count: number }[] | null;
  landingPages: {
    page: string;
    sessions: number;
    engagementRate: number;
    avgSessionSeconds: number;
    leads: number;
  }[];
  channels: {
    label: string;
    sessions: number;
    previousSessions: number;
    engagementRate: number;
    leads: number;
  }[];
};

const zeroChange = (): Ga4Change => ({ current: 0, previous: 0 });

export function emptyGa4Insights(days: number, partial?: Partial<Ga4Insights>): Ga4Insights {
  return {
    configured: false,
    days,
    totals: {
      sessions: zeroChange(),
      users: zeroChange(),
      pageviews: zeroChange(),
      engagementRate: zeroChange(),
      avgSessionSeconds: zeroChange(),
      leads: zeroChange(),
    },
    conversions: [],
    leadMethods: null,
    landingPages: [],
    channels: [],
    ...partial,
  };
}

type Ga4Row = {
  dimensionValues?: ({ value?: string | null } | null)[] | null;
  metricValues?: ({ value?: string | null } | null)[] | null;
};
type Ga4Report = {
  dimensionHeaders?: ({ name?: string | null } | null)[] | null;
  rows?: Ga4Row[] | null;
};

/** Rows keyed by the requested dimension, split into the current and previous date ranges. */
function readReport(report: Ga4Report | undefined, dimension?: string) {
  const headers = (report?.dimensionHeaders ?? []).map((h) => h?.name || "");
  const rangeAt = headers.indexOf("dateRange");
  const dimAt = dimension ? headers.indexOf(dimension) : -1;
  const rows = (report?.rows ?? []).map((row) => ({
    key: dimAt >= 0 ? row.dimensionValues?.[dimAt]?.value || "(not set)" : "",
    previous: rangeAt >= 0 && row.dimensionValues?.[rangeAt]?.value === "previous",
    metric: (index = 0) => Number(row.metricValues?.[index]?.value ?? 0) || 0,
  }));
  return {
    current: rows.filter((row) => !row.previous),
    previous: rows.filter((row) => row.previous),
  };
}

function eventFilter(names: string[]) {
  return {
    filter: {
      fieldName: "eventName",
      inListFilter: { values: names, caseSensitive: false },
    },
  };
}

/** Conversions, landing pages, and channels for the last `days` days next to the `days` before. */
export async function fetchGa4Insights(
  propertyIdInput: string | null | undefined,
  days = 14,
): Promise<Ga4Insights> {
  const { propertyId, clientEmail, ready } = ga4StatusFor(propertyIdInput);
  if (!ready) return emptyGa4Insights(days);
  return cachedInsights(propertyId, clientEmail, days);
}

const cachedInsights = cacheGa("insights", fetchGa4InsightsInner);

async function fetchGa4InsightsInner(
  propertyId: string,
  clientEmail: string,
  days: number,
): Promise<Ga4Insights> {
  try {
    const client = new BetaAnalyticsDataClient({
      credentials: { client_email: clientEmail, private_key: readPrivateKey() },
    });
    const property = `properties/${propertyId}`;
    const current = { startDate: `${days - 1}daysAgo`, endDate: "today", name: "current" };
    const previous = {
      startDate: `${days * 2 - 1}daysAgo`,
      endDate: `${days}daysAgo`,
      name: "previous",
    };
    const bothRanges = [current, previous];
    const allEventNames = GA4_CONVERSION_EVENTS.flatMap((row) => row.names);

    const run = (request: Omit<protos.google.analytics.data.v1beta.IRunReportRequest, "property">) =>
      client.runReport({ property, ...request }).then(([report]) => report as Ga4Report);

    const [totalsRes, eventsRes, landingRes, landingLeadsRes, channelsRes, channelLeadsRes] =
      await Promise.all([
        run({
          dateRanges: bothRanges,
          metrics: [
            { name: "sessions" },
            { name: "totalUsers" },
            { name: "screenPageViews" },
            { name: "engagementRate" },
            { name: "averageSessionDuration" },
          ],
        }),
        run({
          dateRanges: bothRanges,
          dimensions: [{ name: "eventName" }],
          metrics: [{ name: "eventCount" }],
          dimensionFilter: eventFilter(allEventNames),
        }),
        run({
          dateRanges: [current],
          dimensions: [{ name: "landingPage" }],
          metrics: [
            { name: "sessions" },
            { name: "engagementRate" },
            { name: "averageSessionDuration" },
          ],
          orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
          limit: 12,
        }),
        run({
          dateRanges: [current],
          dimensions: [{ name: "landingPage" }],
          metrics: [{ name: "eventCount" }],
          dimensionFilter: eventFilter([LEAD_EVENT]),
          limit: 200,
        }),
        run({
          dateRanges: bothRanges,
          dimensions: [{ name: "sessionDefaultChannelGroup" }],
          metrics: [{ name: "sessions" }, { name: "engagementRate" }],
          orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        }),
        run({
          dateRanges: [current],
          dimensions: [{ name: "sessionDefaultChannelGroup" }],
          metrics: [{ name: "eventCount" }],
          dimensionFilter: eventFilter([LEAD_EVENT]),
        }),
      ]);

    const methodsRes = await run({
      dateRanges: [current],
      dimensions: [{ name: "customEvent:method" }],
      metrics: [{ name: "eventCount" }],
      dimensionFilter: eventFilter([LEAD_EVENT]),
      orderBys: [{ metric: { metricName: "eventCount" }, desc: true }],
    }).catch(() => null);

    const totals = readReport(totalsRes);
    const t = (index: number): Ga4Change => ({
      current: totals.current[0]?.metric(index) ?? 0,
      previous: totals.previous[0]?.metric(index) ?? 0,
    });

    const events = readReport(eventsRes, "eventName");
    const eventSum = (rows: typeof events.current, names: string[]) =>
      rows
        .filter((row) => names.includes(row.key.toLowerCase()))
        .reduce((sum, row) => sum + row.metric(), 0);
    const conversions = GA4_CONVERSION_EVENTS.map((row) => ({
      label: row.label,
      current: eventSum(events.current, row.names),
      previous: eventSum(events.previous, row.names),
    }));

    const leadsBy = (report: Ga4Report, dimension: string) =>
      new Map(readReport(report, dimension).current.map((row) => [row.key, row.metric()]));
    const landingLeads = leadsBy(landingLeadsRes, "landingPage");
    const channelLeads = leadsBy(channelLeadsRes, "sessionDefaultChannelGroup");

    const channels = readReport(channelsRes, "sessionDefaultChannelGroup");
    const previousByChannel = new Map(channels.previous.map((row) => [row.key, row.metric()]));

    return {
      configured: true,
      days,
      totals: {
        sessions: t(0),
        users: t(1),
        pageviews: t(2),
        engagementRate: t(3),
        avgSessionSeconds: t(4),
        leads: {
          current: eventSum(events.current, [LEAD_EVENT]),
          previous: eventSum(events.previous, [LEAD_EVENT]),
        },
      },
      conversions,
      leadMethods: methodsRes
        ? readReport(methodsRes, "customEvent:method").current.map((row) => ({
            label: row.key,
            count: row.metric(),
          }))
        : null,
      landingPages: readReport(landingRes, "landingPage").current.map((row) => ({
        page: row.key,
        sessions: row.metric(0),
        engagementRate: row.metric(1),
        avgSessionSeconds: row.metric(2),
        leads: landingLeads.get(row.key) ?? 0,
      })),
      channels: channels.current.map((row) => ({
        label: row.key,
        sessions: row.metric(0),
        previousSessions: previousByChannel.get(row.key) ?? 0,
        engagementRate: row.metric(1),
        leads: channelLeads.get(row.key) ?? 0,
      })),
    };
  } catch (error) {
    return emptyGa4Insights(days, {
      configured: true,
      error: error instanceof Error ? error.message : "Could not load Google Analytics",
    });
  }
}
