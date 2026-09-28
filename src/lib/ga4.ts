import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { LOCATION_PAGES } from "@/lib/locations";

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

export function ga4ConfigStatus() {
  const propertyId = (process.env.GA4_PROPERTY_ID || "").trim();
  const clientEmail = (
    process.env.GA4_CLIENT_EMAIL ||
    process.env.GOOGLE_CLIENT_EMAIL ||
    ""
  ).trim();
  const privateKey = readPrivateKey();
  return {
    propertyId,
    clientEmail,
    ready: Boolean(propertyId && clientEmail && privateKey),
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

/** Who visits wwwdigisol.com: all visitors next to Google Ads visitors, by age, gender, city, device. */
export async function fetchDigisolGa4Demographics(days = 28): Promise<Ga4Demographics> {
  const { propertyId, clientEmail, ready } = ga4ConfigStatus();
  if (!ready) return emptyGa4Demographics();
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

export async function fetchDigisolGa4Summary(days = 14): Promise<Ga4Summary> {
  const { propertyId, clientEmail, ready } = ga4ConfigStatus();
  if (!ready) {
    return emptySummary({
      configured: false,
      error:
        "Add GA4_PROPERTY_ID, GA4_CLIENT_EMAIL, and GA4_PRIVATE_KEY on Vercel to pull live Google Analytics into this page.",
    });
  }

  const GA4_TIMEOUT_MS = 6000;

  try {
    const summary = await Promise.race([
      fetchDigisolGa4SummaryInner(propertyId, clientEmail, days),
      new Promise<Ga4Summary>((resolve) =>
        setTimeout(
          () =>
            resolve(
              emptySummary({
                configured: true,
                error:
                  "Google Analytics timed out — try refreshing. First-party DigiSol stats below still load.",
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
