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

export async function fetchDigisolGa4Summary(days = 14): Promise<Ga4Summary> {
  const { propertyId, clientEmail, ready } = ga4ConfigStatus();
  if (!ready) {
    return emptySummary({
      configured: false,
      error:
        "Add GA4_PROPERTY_ID, GA4_CLIENT_EMAIL, and GA4_PRIVATE_KEY on Vercel to pull live Google Analytics into this page.",
    });
  }

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

    const [totalsRes, dailyRes, pagesRes, locationsRes, sourcesRes] =
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
          dimensions: [{ name: "sessionDefaultChannelGroup" }],
          metrics: [{ name: "sessions" }],
          orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
          limit: 8,
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
        label: row.dimensionValues?.[0]?.value || "Unknown",
        sessions: metricInt(row),
      })),
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
