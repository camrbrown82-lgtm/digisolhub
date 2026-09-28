import { googleFetch } from "@/lib/google/auth";

const WEBMASTERS = "https://www.googleapis.com/webmasters/v3";
const INSPECT = "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect";

const site = (siteUrl: string) => `${WEBMASTERS}/sites/${encodeURIComponent(siteUrl)}`;

export type SitemapEntry = {
  path: string;
  lastSubmitted?: string;
  lastDownloaded?: string;
  isPending?: boolean;
  errors?: string;
  warnings?: string;
};

export async function listSites() {
  const json = await googleFetch<{ siteEntry?: { siteUrl: string; permissionLevel: string }[] }>(
    `${WEBMASTERS}/sites`,
  );
  return json.siteEntry ?? [];
}

export function getSite(siteUrl: string) {
  return googleFetch<{ siteUrl: string; permissionLevel: string }>(site(siteUrl));
}

export async function listSitemaps(siteUrl: string) {
  const json = await googleFetch<{ sitemap?: SitemapEntry[] }>(`${site(siteUrl)}/sitemaps`);
  return json.sitemap ?? [];
}

export function submitSitemap(siteUrl: string, sitemapUrl: string) {
  return googleFetch(`${site(siteUrl)}/sitemaps/${encodeURIComponent(sitemapUrl)}`, {
    method: "PUT",
  });
}

export type SearchRow = {
  keys?: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export async function searchAnalytics(
  siteUrl: string,
  body: { startDate: string; endDate: string; dimensions?: string[]; rowLimit?: number },
) {
  const json = await googleFetch<{ rows?: SearchRow[] }>(`${site(siteUrl)}/searchAnalytics/query`, {
    body,
  });
  return json.rows ?? [];
}

export type InspectionResult = {
  url: string;
  verdict: string;
  coverage: string;
  lastCrawl: string | null;
};

export async function inspectUrl(siteUrl: string, url: string): Promise<InspectionResult> {
  const json = await googleFetch<{
    inspectionResult?: {
      indexStatusResult?: { verdict?: string; coverageState?: string; lastCrawlTime?: string };
    };
  }>(INSPECT, { body: { inspectionUrl: url, siteUrl } });
  const status = json.inspectionResult?.indexStatusResult ?? {};
  return {
    url,
    verdict: status.verdict || "VERDICT_UNSPECIFIED",
    coverage: status.coverageState || "",
    lastCrawl: status.lastCrawlTime || null,
  };
}

/** Search Console property that covers `host`: domain property first, then URL prefix. */
export function matchSite(sites: { siteUrl: string }[], host: string) {
  const bare = host.replace(/^www\./, "");
  return (
    sites.find((s) => s.siteUrl === `sc-domain:${bare}`) ??
    sites.find((s) => {
      try {
        return new URL(s.siteUrl).hostname.replace(/^www\./, "") === bare;
      } catch {
        return false;
      }
    }) ??
    null
  );
}
