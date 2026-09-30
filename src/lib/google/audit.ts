import type { SupabaseClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { getResendApiKey, getResendFrom } from "@/lib/email";
import { leadAlertRecipients } from "@/lib/leadAlert";
import { DIGISOL_HOUSE_NAME } from "@/lib/branding";
import { DIGISOL_SITE_URL } from "@/lib/site";
import { GoogleApiError, errorMessage, serviceAccountEmail, serviceAccountReady } from "@/lib/google/auth";
import * as ga4 from "@/lib/google/ga4Admin";
import * as gsc from "@/lib/google/searchConsole";
import * as ads from "@/lib/google/adsApi";

export type GoogleProduct = "ga4" | "search_console" | "ads";
export type CheckStatus = "pass" | "warn" | "fail" | "info";
export type FixKind =
  | "ga4_retention"
  | "ga4_locale"
  | "ga4_page_changes"
  | "ga4_key_event"
  | "ga4_ads_link"
  | "gsc_submit_sitemap"
  | "ads_auto_tagging"
  | "ads_search_only"
  | "ads_negative";

export type GoogleCheck = {
  id: string;
  product: GoogleProduct;
  title: string;
  status: CheckStatus;
  detail: string;
  /** `spend` fixes change who sees ads, so the Hub asks before applying. */
  fix?: { kind: FixKind; label: string; spend?: boolean; params?: Record<string, string> };
  link?: { label: string; url: string };
};

export type GoogleSetupIds = {
  ga4PropertyId: string | null;
  searchConsoleSite: string | null;
  adsCustomerId: string | null;
};

export type ProductState = { connected: boolean; error?: string; helpUrl?: string };

export type SearchSummary = {
  days: number;
  clicks: number;
  impressions: number;
  prevClicks: number;
  prevImpressions: number;
  position: number;
  topQueries: { query: string; clicks: number; impressions: number; position: number }[];
  nearPageOne: { query: string; impressions: number; position: number; ctr: number }[];
};

export type AdsSummary = {
  days: number;
  currency: string;
  cost: number;
  clicks: number;
  conversions: number;
};

export type GoogleAudit = {
  ranAt: string;
  ids: GoogleSetupIds;
  products: Record<GoogleProduct, ProductState>;
  checks: GoogleCheck[];
  search?: SearchSummary;
  ads?: AdsSummary;
};

type ProductAudit = {
  state: ProductState;
  checks: GoogleCheck[];
  search?: SearchSummary;
  ads?: AdsSummary;
};

export const PRODUCT_LABELS: Record<GoogleProduct, string> = {
  ga4: "Google Analytics",
  search_console: "Search Console",
  ads: "Google Ads",
};

/** Events worth counting as conversions when a site sends them. */
const LEAD_EVENTS = [
  "generate_lead",
  "purchase",
  "contact_click",
  "book_appointment",
  "sign_up",
  "dispatch_subscribe",
  "phone_call",
  "qualify_lead",
];

const ALBERTA_TZ = "America/Edmonton";

export function scoreAudit(audit: Pick<GoogleAudit, "checks"> | null | undefined) {
  const graded = (audit?.checks ?? []).filter((c) => c.status !== "info");
  if (graded.length === 0) return null;
  return Math.round((graded.filter((c) => c.status === "pass").length / graded.length) * 100);
}

export function siteOrigin(domain: string | null | undefined) {
  const raw = (domain || "").trim();
  if (!raw) return "";
  try {
    return new URL(raw.includes("://") ? raw : `https://${raw}`).origin;
  } catch {
    return "";
  }
}

const hostOf = (url: string | null | undefined) => {
  try {
    return new URL(url || "").hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
};

async function fetchText(url: string) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "DigiSolHub-GoogleCheck/1.0" },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    return res.ok ? await res.text() : null;
  } catch {
    return null;
  }
}

function edmontonDay(offsetDays = 0) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ALBERTA_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(Date.now() + offsetDays * 86_400_000));
}

function cloudProjectId() {
  return serviceAccountEmail().match(/@([a-z0-9-]+)\.iam\.gserviceaccount\.com$/i)?.[1] ?? "";
}

function connectionFailure(product: GoogleProduct, error: unknown): ProductAudit {
  const robot = serviceAccountEmail();
  let message = errorMessage(error);
  let helpUrl: string | undefined;
  if (error instanceof GoogleApiError) {
    helpUrl = error.helpUrl;
    const testAccess =
      error.adsCode === "CLOUD_PROJECT_NOT_APPROVED_FOR_PRODUCTION" ||
      error.adsCode === "DEVELOPER_TOKEN_NOT_APPROVED";
    if (testAccess) {
      const project = cloudProjectId();
      message = `The Google Ads API is already on. The Hub's Cloud project${project ? ` (${project})` : ""} only has Test access, so it cannot read a live Ads account. On that project's Google Ads API page, apply for Explorer access. Google reviews Explorer access automatically.`;
      if (project) {
        helpUrl = `https://console.cloud.google.com/apis/api/googleads.googleapis.com/overview?project=${project}`;
      }
    } else if (error.disabledApi) {
      message = `The ${PRODUCT_LABELS[product]} API is turned off in the Hub's Google Cloud project. Turn it on, wait a minute, then run the check again.`;
    } else if (error.noAccess || error.status === 404) {
      message =
        product === "ads"
          ? `The Hub's manager account can't reach this Google Ads account. Link it under the Hub's manager account (or add ${robot} as a Standard user).`
          : `The Hub's robot login doesn't have access yet. Add ${robot} as ${product === "ga4" ? "an Editor in GA4 (Admin → Property access management)" : "a Full user in Search Console (Settings → Users and permissions)"}.`;
    }
  }
  return { state: { connected: false, error: message, helpUrl }, checks: [] };
}

const notLinked = (message: string): ProductAudit => ({
  state: { connected: false, error: message },
  checks: [],
});

async function auditGa4(ids: GoogleSetupIds, origin: string): Promise<ProductAudit> {
  const pid = ids.ga4PropertyId?.replace(/\D/g, "");
  if (!pid) return notLinked("Pick this company's GA4 property.");
  let property: ga4.Ga4Property & { parent?: string };
  try {
    property = await ga4.getProperty(pid);
  } catch (error) {
    return connectionFailure("ga4", error);
  }
  const account = (property.parent || "").replace("accounts/", "");
  const adminUrl = `https://analytics.google.com/analytics/web/#/a${account}p${pid}/admin`;
  const checks: GoogleCheck[] = [];
  const host = hostOf(origin);

  const [retention, streams, keyEvents, adsLinks, counts28, homepage, sharing] = await Promise.allSettled([
    ga4.getRetention(pid),
    ga4.listStreams(pid),
    ga4.listKeyEvents(pid),
    ids.adsCustomerId ? ga4.listAdsLinks(pid) : Promise.resolve([] as string[]),
    ga4.eventCounts(pid, 28),
    origin ? fetchText(origin) : Promise.resolve(null),
    account ? ga4.getDataSharing(account) : Promise.reject(new Error("No account")),
  ]);

  if (retention.status === "fulfilled") {
    const value = retention.value.eventDataRetention || "TWO_MONTHS";
    const ok = value !== "TWO_MONTHS";
    checks.push({
      id: "ga4_retention",
      product: "ga4",
      title: "Keep 14 months of data",
      status: ok ? "pass" : "warn",
      detail: ok
        ? "Detailed reports can compare this year with last year."
        : "GA4 deletes detailed visitor data after 2 months by default, so year-over-year reports come up empty.",
      fix: ok ? undefined : { kind: "ga4_retention", label: "Keep 14 months" },
    });
  }

  if (property.timeZone !== ALBERTA_TZ || property.currencyCode !== "CAD") {
    checks.push({
      id: "ga4_locale",
      product: "ga4",
      title: "Report time zone and currency",
      status: "info",
      detail: `Reports use ${property.timeZone || "an unknown time zone"} and ${property.currencyCode || "an unknown currency"}. Alberta businesses usually want Mountain time and CAD so days and revenue line up.`,
      fix: { kind: "ga4_locale", label: "Use Alberta time and CAD" },
    });
  }

  const industry =
    property.industryCategory && property.industryCategory !== "INDUSTRY_CATEGORY_UNSPECIFIED"
      ? property.industryCategory.toLowerCase().replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase())
      : "";
  const sharingOn = sharing.status === "fulfilled" ? Boolean(sharing.value.sharingWithOthersEnabled) : null;
  checks.push({
    id: "ga4_benchmarking",
    product: "ga4",
    title: "Industry benchmarking",
    status: industry && sharingOn ? "pass" : sharingOn === null && industry ? "info" : "warn",
    detail: !industry
      ? "No industry category is set, so GA4 can't compare this site with similar businesses. Pick one in Admin → Property details."
      : sharingOn === false
        ? `Industry is "${industry}", but "Modeling contributions & business insights" is off, so benchmarks stay hidden. Turn it on in Admin → Account settings → Data sharing settings.`
        : sharingOn === null
          ? `Industry is "${industry}". Couldn't read the account's data sharing settings; benchmarks need "Modeling contributions & business insights" turned on.`
          : `GA4 compares this site with "${industry}" peers. Benchmarks show in GA4 reports (Benchmarking card and trend charts), where the peer group can be narrowed.`,
    link: industry && sharingOn ? undefined : { label: "Open GA4 admin", url: adminUrl },
  });

  const webStreams = streams.status === "fulfilled" ? streams.value : [];
  const stream =
    webStreams.find((s) => hostOf(s.webStreamData?.defaultUri) === host) ?? webStreams[0] ?? null;
  const measurementId = stream?.webStreamData?.measurementId || "";
  if (streams.status === "fulfilled") {
    checks.push({
      id: "ga4_stream",
      product: "ga4",
      title: "Website data stream",
      status: !stream ? "fail" : host && hostOf(stream.webStreamData?.defaultUri) !== host ? "warn" : "pass",
      detail: !stream
        ? "This property has no website stream, so it collects nothing."
        : `${stream.displayName || "Web stream"} (${measurementId}) points at ${stream.webStreamData?.defaultUri || "no URL"}.`,
      link: stream ? undefined : { label: "Add a web stream", url: `${adminUrl}/streams/table/` },
    });
  }

  const counts = counts28.status === "fulfilled" ? counts28.value : new Map<string, number>();

  if (homepage.status === "fulfilled" && homepage.value !== null && measurementId) {
    const html = homepage.value;
    const tagged = html.includes(measurementId);
    const gtm = /googletagmanager\.com\/gtm\.js|GTM-[A-Z0-9]+/.test(html);
    // Sites that load the tag from script (after consent or an internal-traffic check) keep it out of the raw HTML.
    const receiving = (counts.get("page_view") ?? 0) > 0;
    checks.push({
      id: "ga4_tag",
      product: "ga4",
      title: "Tag installed on the homepage",
      status: tagged || receiving ? "pass" : gtm ? "info" : "fail",
      detail: tagged
        ? `${measurementId} loads on ${origin}.`
        : receiving
          ? `${measurementId} loads from script on ${origin} (not in the page source), and GA4 is receiving visits.`
          : gtm
            ? `${origin} uses Google Tag Manager, so the tag can't be confirmed from the page. Check that GTM fires ${measurementId}.`
            : `${measurementId} isn't on ${origin}. Add the Google tag so visits are counted.`,
    });
  }

  if (counts28.status === "fulfilled") {
    const pageViews = counts.get("page_view") ?? 0;
    checks.push({
      id: "ga4_data",
      product: "ga4",
      title: "Data coming in",
      status: pageViews > 0 ? "pass" : "fail",
      detail:
        pageViews > 0
          ? `${pageViews.toLocaleString("en-CA")} page views in the last 28 days.`
          : "No page views in the last 28 days. The tag is missing or blocked.",
    });
  }

  if (stream) {
    try {
      const em = await ga4.getEnhancedMeasurement(stream.name);
      const ok = Boolean(em.streamEnabled && em.pageChangesEnabled);
      checks.push({
        id: "ga4_page_changes",
        product: "ga4",
        title: "Count every page view once",
        status: ok ? "pass" : "warn",
        detail: ok
          ? "GA4 records page loads and in-site navigation automatically."
          : "Automatic page tracking is off for in-site navigation, so modern sites under-count page views.",
        fix: ok ? undefined : { kind: "ga4_page_changes", label: "Turn on", params: { stream: stream.name } },
      });
    } catch {
      // v1alpha settings are optional; skip when Google refuses them.
    }
  }

  if (keyEvents.status === "fulfilled") {
    const current = new Set(keyEvents.value);
    const missing = LEAD_EVENTS.filter((e) => !current.has(e) && (counts.get(e) ?? 0) > 0);
    for (const eventName of missing) {
      checks.push({
        id: `ga4_key_event_${eventName}`,
        product: "ga4",
        title: `Count "${eventName}" as a conversion`,
        status: "warn",
        detail: `The site sent ${counts.get(eventName)} "${eventName}" events in 28 days, but GA4 doesn't treat them as key events, so they're missing from conversion reports and Google Ads.`,
        fix: { kind: "ga4_key_event", label: "Mark as key event", params: { eventName } },
      });
    }
    const firing = keyEvents.value.filter((e) => (counts.get(e) ?? 0) > 0);
    checks.push({
      id: "ga4_key_events",
      product: "ga4",
      title: "Conversions tracked",
      status: current.size === 0 && missing.length === 0 ? "fail" : firing.length > 0 ? "pass" : "info",
      detail:
        current.size === 0 && missing.length === 0
          ? "No key events are set up and the site doesn't send lead events like generate_lead. Add lead tracking to the contact form."
          : firing.length > 0
            ? `Key events with activity in 28 days: ${firing.join(", ")}.`
            : `Key events set up (${keyEvents.value.join(", ") || "none"}) but none happened in 28 days.`,
      link:
        current.size === 0 && missing.length === 0
          ? { label: "Key events in GA4", url: `${adminUrl}/events` }
          : undefined,
    });
  }

  if (ids.adsCustomerId && adsLinks.status === "fulfilled") {
    const cid = ads.cleanCustomerId(ids.adsCustomerId);
    const linked = adsLinks.value.includes(cid);
    checks.push({
      id: "ga4_ads_link",
      product: "ga4",
      title: "Linked to Google Ads",
      status: linked ? "pass" : "warn",
      detail: linked
        ? "Ads clicks and costs show in GA4, and GA4 audiences can be used in Ads."
        : "GA4 and Google Ads aren't linked, so ad clicks can't be tied to what visitors did next.",
      fix: linked ? undefined : { kind: "ga4_ads_link", label: "Link Google Ads" },
    });
  }

  checks.push({
    id: "ga4_search_console_link",
    product: "ga4",
    title: "Search Console link",
    status: "info",
    detail:
      "Google doesn't allow this link by API. Link it once so organic search queries show inside GA4 (Admin → Product links → Search Console links).",
    link: { label: "Open product links", url: `${adminUrl}/integrations/search-console` },
  });

  return { state: { connected: true }, checks };
}

function parseSitemapLocs(xml: string) {
  return Array.from(xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)).map((m) => m[1].trim());
}

async function auditSearchConsole(ids: GoogleSetupIds, origin: string): Promise<ProductAudit> {
  const site = ids.searchConsoleSite?.trim();
  if (!site) return notLinked("Pick this company's Search Console property.");
  let permission = "";
  try {
    permission = (await gsc.getSite(site)).permissionLevel;
  } catch (error) {
    return connectionFailure("search_console", error);
  }
  const consoleUrl = `https://search.google.com/search-console?resource_id=${encodeURIComponent(site)}`;
  const checks: GoogleCheck[] = [];
  const canWrite = permission === "siteOwner" || permission === "siteFullUser";
  checks.push({
    id: "gsc_access",
    product: "search_console",
    title: "DigiSol has access",
    status: permission === "siteUnverifiedUser" ? "fail" : canWrite ? "pass" : "warn",
    detail:
      permission === "siteUnverifiedUser"
        ? "The site isn't verified in Search Console yet."
        : canWrite
          ? "Full access: DigiSol can submit sitemaps and check pages."
          : `Access is "${permission}". Upgrade ${serviceAccountEmail()} to Full so sitemaps can be submitted.`,
  });

  const [listed, robots] = await Promise.all([
    gsc.listSitemaps(site).catch(() => [] as gsc.SitemapEntry[]),
    origin ? fetchText(`${origin}/robots.txt`) : Promise.resolve(null),
  ]);
  const expected = new Set<string>();
  for (const m of Array.from((robots || "").matchAll(/^\s*sitemap:\s*(\S+)/gim))) expected.add(m[1]);
  let sitemapXml: string | null = null;
  if (origin) {
    sitemapXml = await fetchText(`${origin}/sitemap.xml`);
    if (sitemapXml) expected.add(`${origin}/sitemap.xml`);
  }
  const listedPaths = new Set(listed.map((s) => s.path));
  for (const url of Array.from(expected)) {
    if (listedPaths.has(url)) continue;
    checks.push({
      id: `gsc_sitemap_${url}`,
      product: "search_console",
      title: `Submit ${url.replace(origin, "") || url}`,
      status: "warn",
      detail: "This sitemap is live on the site but Google hasn't been told about it.",
      fix: canWrite ? { kind: "gsc_submit_sitemap", label: "Submit", params: { url } } : undefined,
    });
  }
  const broken = listed.filter((s) => Number(s.errors || 0) > 0);
  checks.push({
    id: "gsc_sitemaps",
    product: "search_console",
    title: "Sitemaps read without errors",
    status: listed.length === 0 ? (expected.size ? "warn" : "fail") : broken.length ? "warn" : "pass",
    detail:
      listed.length === 0
        ? expected.size
          ? "No sitemaps submitted yet."
          : "The site has no sitemap.xml. Add one so Google finds every page."
        : broken.length
          ? `Errors in: ${broken.map((s) => s.path).join(", ")}.`
          : `${listed.length} sitemap${listed.length === 1 ? "" : "s"} submitted, no errors.`,
    link: broken.length ? { label: "Open sitemaps", url: consoleUrl.replace("search-console?", "search-console/sitemaps?") } : undefined,
  });

  const locs = sitemapXml ? parseSitemapLocs(sitemapXml) : [];
  const unique = [origin ? `${origin}/` : "", ...locs].filter((u, i, all) => u && all.indexOf(u) === i);
  const isLandingUrl = (url: string) => {
    try {
      return /\/locations(\/|$)/i.test(new URL(url).pathname);
    } catch {
      return false;
    }
  };
  const landingPages = unique.filter(isLandingUrl);
  const otherPages = unique.filter((url) => !isLandingUrl(url)).sort((a, b) => a.length - b.length);
  const key = [...landingPages, ...otherPages].slice(0, Math.max(10, landingPages.length + 6));
  if (key.length) {
    const results: gsc.InspectionResult[] = [];
    for (let i = 0; i < key.length; i += 5) {
      const batch = await Promise.allSettled(key.slice(i, i + 5).map((u) => gsc.inspectUrl(site, u)));
      for (const r of batch) if (r.status === "fulfilled") results.push(r.value);
    }
    if (results.length) {
      const missing = results.filter((r) => r.verdict !== "PASS");
      checks.push({
        id: "gsc_indexed",
        product: "search_console",
        title: "Key pages on Google",
        status: missing.length === 0 ? "pass" : missing.length > results.length / 2 ? "fail" : "warn",
        detail:
          missing.length === 0
            ? `All ${results.length} key pages checked are indexed.`
            : `${results.length - missing.length} of ${results.length} indexed. Not yet: ${missing
                .map((r) => `${r.url.replace(origin, "") || "/"} (${r.coverage || "unknown"})`)
                .join("; ")}. Paste each into Search Console's top bar and click Request indexing (Google has no API for that button).`,
        link: missing.length ? { label: "Open Search Console", url: consoleUrl } : undefined,
      });
    }
  }

  let search: SearchSummary | undefined;
  try {
    const end = edmontonDay(-3);
    const start = edmontonDay(-30);
    const prevEnd = edmontonDay(-31);
    const prevStart = edmontonDay(-58);
    const [now, prev, queries] = await Promise.all([
      gsc.searchAnalytics(site, { startDate: start, endDate: end }),
      gsc.searchAnalytics(site, { startDate: prevStart, endDate: prevEnd }),
      gsc.searchAnalytics(site, { startDate: start, endDate: end, dimensions: ["query"], rowLimit: 250 }),
    ]);
    const rows = queries.map((r) => ({
      query: r.keys?.[0] || "",
      clicks: r.clicks,
      impressions: r.impressions,
      ctr: r.ctr,
      position: Math.round(r.position * 10) / 10,
    }));
    search = {
      days: 28,
      clicks: now[0]?.clicks ?? 0,
      impressions: now[0]?.impressions ?? 0,
      prevClicks: prev[0]?.clicks ?? 0,
      prevImpressions: prev[0]?.impressions ?? 0,
      position: Math.round((now[0]?.position ?? 0) * 10) / 10,
      topQueries: rows.slice(0, 10).map(({ ctr: _ctr, ...r }) => r),
      nearPageOne: rows
        .filter((r) => r.impressions >= 20 && r.position > 3 && r.position <= 20)
        .sort((a, b) => b.impressions - a.impressions)
        .slice(0, 8)
        .map(({ clicks: _clicks, ...r }) => r),
    };
    if (search.nearPageOne.length) {
      checks.push({
        id: "gsc_near_page_one",
        product: "search_console",
        title: "Searches close to the top",
        status: "info",
        detail: `Already showing for these but below the top 3: ${search.nearPageOne
          .slice(0, 5)
          .map((q) => `"${q.query}" (#${q.position})`)
          .join(", ")}. A page or blog post aimed at each one is the quickest organic win.`,
      });
    }
  } catch {
    // Performance data is a bonus; the setup checks above still stand.
  }

  return { state: { connected: true }, checks, search };
}

type AdsRow = {
  customer?: {
    descriptiveName?: string;
    currencyCode?: string;
    autoTaggingEnabled?: boolean;
    conversionTrackingSetting?: { enhancedConversionsForLeadsEnabled?: boolean };
  };
  campaign?: {
    resourceName?: string;
    name?: string;
    advertisingChannelType?: string;
    networkSettings?: { targetContentNetwork?: boolean; targetPartnerSearchNetwork?: boolean };
  };
  metrics?: { costMicros?: string; clicks?: string; conversions?: number; allConversions?: number };
  conversionAction?: { resourceName?: string; name?: string; primaryForGoal?: boolean };
  searchTermView?: { searchTerm?: string; status?: string };
  campaignCriterion?: { keyword?: { text?: string } };
  adGroupAd?: { ad?: { id?: string }; policySummary?: { approvalStatus?: string } };
  adGroup?: { name?: string };
};

/** A client-account 403 is often just "test access" reported more clearly on the manager account. */
async function adsAccessError(error: unknown) {
  if (!(error instanceof GoogleApiError) || error.adsCode !== "USER_PERMISSION_DENIED") return error;
  try {
    await ads.listManagedAccounts();
  } catch (managerError) {
    if (
      managerError instanceof GoogleApiError &&
      managerError.adsCode &&
      managerError.adsCode !== "USER_PERMISSION_DENIED"
    ) {
      return managerError;
    }
  }
  return error;
}

async function auditAds(ids: GoogleSetupIds): Promise<ProductAudit> {
  const cid = ads.cleanCustomerId(ids.adsCustomerId);
  if (!cid) return notLinked("Pick this company's Google Ads account, or leave it empty if they don't run ads.");
  if (!ads.adsApiReady()) {
    return notLinked(
      "Add GOOGLE_ADS_MANAGER_ID (the Hub's manager account number) on Vercel, then redeploy.",
    );
  }
  let customer: AdsRow["customer"];
  try {
    const rows = await ads.adsSearch<AdsRow>(
      cid,
      "SELECT customer.descriptive_name, customer.currency_code, customer.auto_tagging_enabled, customer.conversion_tracking_setting.enhanced_conversions_for_leads_enabled FROM customer",
    );
    customer = rows[0]?.customer;
  } catch (error) {
    return connectionFailure("ads", await adsAccessError(error));
  }
  const checks: GoogleCheck[] = [];
  const currency = customer?.currencyCode || "CAD";
  const money = (n: number) =>
    new Intl.NumberFormat("en-CA", { style: "currency", currency, maximumFractionDigits: 2 }).format(n);

  checks.push({
    id: "ads_auto_tagging",
    product: "ads",
    title: "Auto-tagging on",
    status: customer?.autoTaggingEnabled ? "pass" : "fail",
    detail: customer?.autoTaggingEnabled
      ? "Every ad click carries a click ID, so conversions and GA4 reports match up."
      : "Without auto-tagging, Google can't tie leads back to the ad click and GA4 shows ads as unknown traffic.",
    fix: customer?.autoTaggingEnabled ? undefined : { kind: "ads_auto_tagging", label: "Turn on" },
  });

  checks.push({
    id: "ads_enhanced_leads",
    product: "ads",
    title: "Enhanced conversions for leads",
    status: customer?.conversionTrackingSetting?.enhancedConversionsForLeadsEnabled ? "pass" : "warn",
    detail: customer?.conversionTrackingSetting?.enhancedConversionsForLeadsEnabled
      ? "Google can match leads to ad clicks even when cookies are blocked."
      : "Turn this on so Google can match form leads to ad clicks when cookies are blocked. It needs the customer-data terms accepted, which Google only allows in the Ads screen (Goals → Settings).",
    link: customer?.conversionTrackingSetting?.enhancedConversionsForLeadsEnabled
      ? undefined
      : { label: "Open conversion settings", url: "https://ads.google.com/aw/conversions/settings" },
  });

  const [campaigns, metrics, actions, terms, negatives, disapproved] = await Promise.allSettled([
    ads.adsSearch<AdsRow>(
      cid,
      "SELECT campaign.resource_name, campaign.name, campaign.advertising_channel_type, campaign.network_settings.target_content_network, campaign.network_settings.target_partner_search_network FROM campaign WHERE campaign.status = 'ENABLED'",
    ),
    ads.adsSearch<AdsRow>(
      cid,
      "SELECT campaign.resource_name, metrics.cost_micros, metrics.clicks, metrics.conversions FROM campaign WHERE segments.date DURING LAST_30_DAYS",
    ),
    ads.adsSearch<AdsRow>(
      cid,
      "SELECT conversion_action.resource_name, conversion_action.name, conversion_action.primary_for_goal FROM conversion_action WHERE conversion_action.status = 'ENABLED'",
    ),
    ads.adsSearch<AdsRow>(
      cid,
      "SELECT search_term_view.search_term, search_term_view.status, campaign.resource_name, campaign.name, metrics.cost_micros, metrics.clicks, metrics.conversions FROM search_term_view WHERE segments.date DURING LAST_30_DAYS AND metrics.cost_micros > 0 ORDER BY metrics.cost_micros DESC LIMIT 60",
    ),
    ads.adsSearch<AdsRow>(
      cid,
      "SELECT campaign.resource_name, campaign_criterion.keyword.text FROM campaign_criterion WHERE campaign_criterion.negative = TRUE AND campaign_criterion.type = 'KEYWORD'",
    ),
    ads.adsSearch<AdsRow>(
      cid,
      "SELECT ad_group_ad.ad.id, ad_group.name, campaign.name, ad_group_ad.policy_summary.approval_status FROM ad_group_ad WHERE ad_group_ad.status = 'ENABLED' AND ad_group.status = 'ENABLED' AND campaign.status = 'ENABLED' AND ad_group_ad.policy_summary.approval_status IN ('DISAPPROVED', 'APPROVED_LIMITED')",
    ),
  ]);

  let cost = 0;
  let clicks = 0;
  let conversions = 0;
  if (metrics.status === "fulfilled") {
    for (const r of metrics.value) {
      cost += ads.micros(r.metrics?.costMicros);
      clicks += Number(r.metrics?.clicks || 0);
      conversions += Number(r.metrics?.conversions || 0);
    }
  }

  if (actions.status === "fulfilled") {
    const primary = actions.value.filter((r) => r.conversionAction?.primaryForGoal);
    checks.push({
      id: "ads_conversions",
      product: "ads",
      title: "Conversions recording",
      status: primary.length === 0 ? "fail" : cost >= 50 && conversions === 0 ? "warn" : "pass",
      detail:
        primary.length === 0
          ? "No primary conversion actions, so Google's bidding is flying blind."
          : cost >= 50 && conversions === 0
            ? `${money(cost)} spent in 30 days with no conversions recorded. Check that the conversion tags fire on the thank-you page.`
            : `${primary.length} primary conversion action${primary.length === 1 ? "" : "s"}; ${Math.round(conversions)} conversions in 30 days.`,
      link:
        primary.length === 0 || (cost >= 50 && conversions === 0)
          ? { label: "Open conversions", url: "https://ads.google.com/aw/conversions" }
          : undefined,
    });
  }

  if (campaigns.status === "fulfilled") {
    for (const r of campaigns.value) {
      const c = r.campaign;
      if (!c?.resourceName || c.advertisingChannelType !== "SEARCH") continue;
      const display = c.networkSettings?.targetContentNetwork;
      const partners = c.networkSettings?.targetPartnerSearchNetwork;
      if (!display && !partners) continue;
      checks.push({
        id: `ads_networks_${c.resourceName}`,
        product: "ads",
        title: `"${c.name}" runs outside Google Search`,
        status: "warn",
        detail: `This Search campaign also shows on ${[display ? "the Display Network" : "", partners ? "search partner sites" : ""].filter(Boolean).join(" and ")}. For local service businesses that usually spends budget on low-intent clicks.`,
        fix: {
          kind: "ads_search_only",
          label: "Google Search only",
          spend: true,
          params: { campaign: c.resourceName, name: c.name || "" },
        },
      });
    }
  }

  if (terms.status === "fulfilled") {
    const negated = new Set(
      negatives.status === "fulfilled"
        ? negatives.value.map(
            (r) => `${r.campaign?.resourceName}|${(r.campaignCriterion?.keyword?.text || "").toLowerCase()}`,
          )
        : [],
    );
    const wasted = terms.value
      .filter((r) => {
        const term = (r.searchTermView?.searchTerm || "").toLowerCase();
        return (
          term &&
          !/EXCLUDED/.test(r.searchTermView?.status || "") &&
          !negated.has(`${r.campaign?.resourceName}|${term}`) &&
          Number(r.metrics?.conversions || 0) === 0 &&
          Number(r.metrics?.clicks || 0) >= 3 &&
          ads.micros(r.metrics?.costMicros) >= 10
        );
      })
      .slice(0, 8);
    for (const r of wasted) {
      const term = r.searchTermView?.searchTerm || "";
      checks.push({
        id: `ads_negative_${r.campaign?.resourceName}_${term}`,
        product: "ads",
        title: `Wasted search: "${term}"`,
        status: "warn",
        detail: `${money(ads.micros(r.metrics?.costMicros))} and ${r.metrics?.clicks} clicks in 30 days with no leads (campaign "${r.campaign?.name}"). Block it if it isn't a real customer search.`,
        fix: {
          kind: "ads_negative",
          label: "Block this search",
          spend: true,
          params: { campaign: r.campaign?.resourceName || "", text: term },
        },
      });
    }
  }

  if (disapproved.status === "fulfilled") {
    const bad = disapproved.value.filter(
      (r) => r.adGroupAd?.policySummary?.approvalStatus === "DISAPPROVED",
    );
    const limited = disapproved.value.length - bad.length;
    checks.push({
      id: "ads_policy",
      product: "ads",
      title: "Ads approved",
      status: bad.length ? "fail" : limited ? "warn" : "pass",
      detail: bad.length
        ? `${bad.length} ad${bad.length === 1 ? " is" : "s are"} disapproved (${Array.from(new Set(bad.map((r) => r.campaign?.name))).join(", ")}).`
        : limited
          ? `${limited} ad${limited === 1 ? " is" : "s are"} approved with limits, so they show less often.`
          : "No disapproved or limited ads.",
      link: bad.length || limited ? { label: "Open ads", url: "https://ads.google.com/aw/ads" } : undefined,
    });
  }

  return {
    state: { connected: true },
    checks,
    ads: { days: 30, currency, cost: Math.round(cost * 100) / 100, clicks, conversions: Math.round(conversions * 10) / 10 },
  };
}

const PRODUCT_AUDITS: Record<GoogleProduct, (ids: GoogleSetupIds, origin: string) => Promise<ProductAudit>> = {
  ga4: auditGa4,
  search_console: auditSearchConsole,
  ads: (ids) => auditAds(ids),
};

/** Runs every product (or one), merging into `previous` when only some are re-run. */
export async function runGoogleAudit(
  ids: GoogleSetupIds,
  domain: string | null | undefined,
  options: { only?: GoogleProduct[]; previous?: GoogleAudit | null } = {},
): Promise<GoogleAudit> {
  const origin = siteOrigin(domain);
  const products = options.only ?? (Object.keys(PRODUCT_AUDITS) as GoogleProduct[]);
  const results = await Promise.all(
    products.map(async (p) => {
      if (!serviceAccountReady()) {
        return [p, notLinked("Add GA4_CLIENT_EMAIL and GA4_PRIVATE_KEY (DigiSol's Google robot login) on Vercel.")] as const;
      }
      try {
        return [p, await PRODUCT_AUDITS[p](ids, origin)] as const;
      } catch (error) {
        return [p, connectionFailure(p, error)] as const;
      }
    }),
  );
  const base: GoogleAudit =
    options.previous && options.only
      ? { ...options.previous, ids }
      : {
          ranAt: "",
          ids,
          products: {
            ga4: { connected: false },
            search_console: { connected: false },
            ads: { connected: false },
          },
          checks: [],
        };
  const rerun = new Set(products);
  const audit: GoogleAudit = {
    ...base,
    ranAt: new Date().toISOString(),
    products: { ...base.products },
    checks: base.checks.filter((c) => !rerun.has(c.product)),
  };
  for (const [product, result] of results) {
    audit.products[product] = result.state;
    audit.checks.push(...result.checks);
    if (product === "search_console") audit.search = result.search;
    if (product === "ads") audit.ads = result.ads;
  }
  const order: GoogleProduct[] = ["ga4", "search_console", "ads"];
  const rank: Record<CheckStatus, number> = { fail: 0, warn: 1, pass: 2, info: 3 };
  audit.checks.sort(
    (a, b) => order.indexOf(a.product) - order.indexOf(b.product) || rank[a.status] - rank[b.status],
  );
  return audit;
}

/** Applies a check's fix using the saved account IDs, never IDs from the browser. */
export async function applyGoogleFix(check: GoogleCheck, ids: GoogleSetupIds) {
  const fix = check.fix;
  if (!fix) throw new Error("This check has no automatic fix.");
  const pid = ids.ga4PropertyId?.replace(/\D/g, "") || "";
  const cid = ads.cleanCustomerId(ids.adsCustomerId);
  const params = fix.params ?? {};
  const need = (value: string, what: string) => {
    if (!value) throw new Error(`Link ${what} first.`);
    return value;
  };
  switch (fix.kind) {
    case "ga4_retention":
      await ga4.setMaxRetention(need(pid, "a GA4 property"));
      return "GA4 now keeps 14 months of detailed data.";
    case "ga4_locale":
      await ga4.setPropertyLocale(need(pid, "a GA4 property"), ALBERTA_TZ, "CAD");
      return "Reports now use Mountain time and CAD.";
    case "ga4_page_changes":
      await ga4.enablePageChangeTracking(need(params.stream || "", "a web stream"));
      return "GA4 now counts in-site navigation as page views.";
    case "ga4_key_event":
      await ga4.createKeyEvent(need(pid, "a GA4 property"), need(params.eventName || "", "an event"));
      return `"${params.eventName}" is now a key event.`;
    case "ga4_ads_link":
      await ga4.createAdsLink(need(pid, "a GA4 property"), need(cid, "a Google Ads account"));
      return "GA4 is linked to Google Ads.";
    case "gsc_submit_sitemap":
      await gsc.submitSitemap(need(ids.searchConsoleSite || "", "a Search Console property"), need(params.url || "", "a sitemap"));
      return "Sitemap submitted. Google reads it within a day or two.";
    case "ads_auto_tagging":
      await ads.enableAutoTagging(need(cid, "a Google Ads account"));
      return "Auto-tagging is on.";
    case "ads_search_only":
      await ads.searchOnlyNetworks(need(cid, "a Google Ads account"), need(params.campaign || "", "a campaign"));
      return `"${params.name}" now shows on Google Search only.`;
    case "ads_negative":
      await ads.addCampaignNegative(
        need(cid, "a Google Ads account"),
        need(params.campaign || "", "a campaign"),
        need(params.text || "", "a search term"),
      );
      return `"${params.text}" is blocked for that campaign.`;
  }
}

export const FIX_PRODUCT: Record<FixKind, GoogleProduct> = {
  ga4_retention: "ga4",
  ga4_locale: "ga4",
  ga4_page_changes: "ga4",
  ga4_key_event: "ga4",
  ga4_ads_link: "ga4",
  gsc_submit_sitemap: "search_console",
  ads_auto_tagging: "ads",
  ads_search_only: "ads",
  ads_negative: "ads",
};

// ---------------------------------------------------------------- storage

export type GoogleSetupRecord = {
  needsMigration: boolean;
  saved: boolean;
  ids: GoogleSetupIds;
  audit: GoogleAudit | null;
  previous: GoogleAudit | null;
};

const EMPTY_IDS: GoogleSetupIds = { ga4PropertyId: null, searchConsoleSite: null, adsCustomerId: null };

/** Saved values win. Blank fields fall back so DigiSol's own Ads account is still checked. */
function mergeIds(saved: GoogleSetupIds, defaults: GoogleSetupIds): GoogleSetupIds {
  return {
    ga4PropertyId: saved.ga4PropertyId || defaults.ga4PropertyId,
    searchConsoleSite: saved.searchConsoleSite || defaults.searchConsoleSite,
    adsCustomerId: ads.cleanCustomerId(saved.adsCustomerId) || defaults.adsCustomerId,
  };
}

const missingSchema = (message?: string) =>
  Boolean(message && /google_setups|google_fix_log|schema cache|does not exist/i.test(message));

/** DigiSol's own IDs when nothing is saved yet, so the house workspace works on day one. */
export function houseDefaults(): GoogleSetupIds {
  return {
    ga4PropertyId: process.env.GA4_PROPERTY_ID?.trim() || null,
    searchConsoleSite: `${DIGISOL_SITE_URL}/`,
    adsCustomerId: ads.cleanCustomerId(process.env.GOOGLE_ADS_CUSTOMER_ID) || null,
  };
}

export async function loadGoogleSetup(
  db: SupabaseClient,
  clientId: string,
  defaults: GoogleSetupIds = EMPTY_IDS,
): Promise<GoogleSetupRecord> {
  const { data, error } = await db
    .from("google_setups")
    .select("ga4_property_id, search_console_site, ads_customer_id, audit, previous_audit")
    .eq("client_id", clientId)
    .maybeSingle();
  if (error) {
    return { needsMigration: missingSchema(error.message), saved: false, ids: defaults, audit: null, previous: null };
  }
  if (!data) return { needsMigration: false, saved: false, ids: defaults, audit: null, previous: null };
  return {
    needsMigration: false,
    saved: true,
    ids: mergeIds(
      {
        ga4PropertyId: data.ga4_property_id || null,
        searchConsoleSite: data.search_console_site || null,
        adsCustomerId: data.ads_customer_id || null,
      },
      defaults,
    ),
    audit: (data.audit as GoogleAudit | null) ?? null,
    previous: (data.previous_audit as GoogleAudit | null) ?? null,
  };
}

export async function saveGoogleIds(db: SupabaseClient, clientId: string, ids: GoogleSetupIds) {
  const { error } = await db.from("google_setups").upsert(
    {
      client_id: clientId,
      ga4_property_id: ids.ga4PropertyId?.replace(/\D/g, "") || null,
      search_console_site: ids.searchConsoleSite?.trim() || null,
      ads_customer_id: ads.cleanCustomerId(ids.adsCustomerId) || null,
    },
    { onConflict: "client_id" },
  );
  if (error) throw new Error(error.message);
}

/** `keepPrevious` is for small re-checks after a fix, so the weekly baseline isn't replaced. */
export async function saveGoogleAudit(
  db: SupabaseClient,
  clientId: string,
  audit: GoogleAudit,
  options: { keepPrevious?: boolean } = {},
) {
  const current = options.keepPrevious ? null : await loadGoogleSetup(db, clientId);
  const { error } = await db.from("google_setups").upsert(
    {
      client_id: clientId,
      ga4_property_id: audit.ids.ga4PropertyId,
      search_console_site: audit.ids.searchConsoleSite,
      ads_customer_id: audit.ids.adsCustomerId,
      audit,
      audited_at: audit.ranAt,
      ...(current?.audit ? { previous_audit: current.audit } : {}),
    },
    { onConflict: "client_id" },
  );
  if (error) throw new Error(error.message);
}

export async function logGoogleFix(
  db: SupabaseClient,
  input: { clientId: string; check: GoogleCheck; ok: boolean; detail: string; userEmail?: string | null },
) {
  await db.from("google_fix_log").insert({
    client_id: input.clientId,
    check_id: input.check.id,
    fix_kind: input.check.fix?.kind ?? null,
    title: input.check.title,
    ok: input.ok,
    detail: input.detail.slice(0, 1000),
    applied_by: input.userEmail ?? null,
  });
}

export async function recentGoogleFixes(db: SupabaseClient, clientId: string, limit = 10) {
  const { data } = await db
    .from("google_fix_log")
    .select("title, ok, detail, applied_by, created_at")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as { title: string; ok: boolean; detail: string; applied_by: string | null; created_at: string }[];
}

// ---------------------------------------------------------------- discovery

export type GoogleDiscovery = {
  robotEmail: string;
  properties: (ga4.Ga4PropertySummary & { matches: boolean })[];
  sites: { siteUrl: string; permissionLevel: string; matches: boolean }[];
  adsAccounts: { customerId: string; name: string }[];
  suggested: GoogleSetupIds;
  errors: Partial<Record<GoogleProduct, string>>;
};

/** What the robot login can already see, with the best guess for this company's domain. */
export async function discoverGoogleAccess(domain: string | null | undefined): Promise<GoogleDiscovery> {
  const host = hostOf(siteOrigin(domain));
  const errors: GoogleDiscovery["errors"] = {};
  const [props, sites, accounts] = await Promise.allSettled([
    ga4.listAccessibleProperties(),
    gsc.listSites(),
    ads.adsApiReady() ? ads.listManagedAccounts() : Promise.resolve([]),
  ]);

  let properties: GoogleDiscovery["properties"] = [];
  if (props.status === "fulfilled") {
    properties = await Promise.all(
      props.value.slice(0, 25).map(async (p) => {
        const streams = await ga4.listStreams(p.propertyId).catch(() => []);
        return { ...p, matches: Boolean(host) && streams.some((s) => hostOf(s.webStreamData?.defaultUri) === host) };
      }),
    );
  } else errors.ga4 = connectionFailure("ga4", props.reason).state.error;

  const siteList = sites.status === "fulfilled" ? sites.value : [];
  if (sites.status === "rejected") errors.search_console = connectionFailure("search_console", sites.reason).state.error;
  const matchedSite = host ? gsc.matchSite(siteList, host) : null;

  const adsAccounts = accounts.status === "fulfilled" ? accounts.value : [];
  if (accounts.status === "rejected") errors.ads = connectionFailure("ads", accounts.reason).state.error;

  return {
    robotEmail: serviceAccountEmail(),
    properties,
    sites: siteList.map((s) => ({ ...s, matches: s.siteUrl === matchedSite?.siteUrl })),
    adsAccounts,
    suggested: {
      ga4PropertyId: properties.find((p) => p.matches)?.propertyId ?? null,
      searchConsoleSite: matchedSite?.siteUrl ?? null,
      adsCustomerId: null,
    },
    errors,
  };
}

// ---------------------------------------------------------------- weekly job

const problemKey = (c: GoogleCheck) => `${c.id}:${c.status}`;

export function newProblems(audit: GoogleAudit, previous: GoogleAudit | null) {
  const before = new Set((previous?.checks ?? []).map(problemKey));
  return audit.checks.filter(
    (c) => (c.status === "warn" || c.status === "fail") && !before.has(problemKey(c)),
  );
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

async function sendWeeklyDigest(
  companies: { name: string; score: number | null; problems: GoogleCheck[]; fixed: number }[],
) {
  const key = getResendApiKey();
  const worth = companies.filter((c) => c.problems.length || c.fixed);
  if (!key || worth.length === 0) return false;
  const html = `
<div style="font-family:Inter,Arial,Helvetica,sans-serif;color:#18181b;max-width:600px;">
  <p style="margin:0 0 4px;font-size:13px;color:#71717a;font-weight:600;">Weekly Google check</p>
  <h1 style="margin:0 0 16px;font-size:22px;">${worth.reduce((n, c) => n + c.problems.length, 0)} new thing${worth.reduce((n, c) => n + c.problems.length, 0) === 1 ? "" : "s"} to look at</h1>
  ${worth
    .map(
      (c) => `
  <div style="margin:0 0 16px;padding:14px;border:1px solid #e4e4e7;border-radius:12px;">
    <p style="margin:0 0 6px;font-weight:700;">${escapeHtml(c.name)}${c.score != null ? ` · setup score ${c.score}` : ""}</p>
    ${c.fixed ? `<p style="margin:0 0 6px;color:#15803d;">${c.fixed} issue${c.fixed === 1 ? "" : "s"} resolved since last week.</p>` : ""}
    ${c.problems
      .map(
        (p) =>
          `<p style="margin:0 0 6px;"><strong>${escapeHtml(PRODUCT_LABELS[p.product])}:</strong> ${escapeHtml(p.title)}${p.fix ? " <em>(one-click fix in the Hub)</em>" : ""}<br><span style="color:#52525b;">${escapeHtml(p.detail)}</span></p>`,
      )
      .join("")}
  </div>`,
    )
    .join("")}
  <p style="margin:16px 0 0;"><a href="${DIGISOL_SITE_URL}/hub/google">Open Google setup in the Hub</a>. Switch Working on to each company to apply fixes.</p>
</div>`.trim();
  const { error } = await new Resend(key).emails.send({
    from: getResendFrom(),
    to: leadAlertRecipients(),
    subject: `Weekly Google check: ${worth.map((c) => c.name).join(", ")}`,
    html,
  });
  return !error;
}

export async function auditAllGoogleSetups(db: SupabaseClient) {
  if (!serviceAccountReady()) return { skipped: "Google service account missing" };
  const { data, error } = await db
    .from("google_setups")
    .select("client_id, ga4_property_id, search_console_site, ads_customer_id, audit, clients(name, domain)");
  if (error) return { skipped: error.message };
  const digest: Parameters<typeof sendWeeklyDigest>[0] = [];
  for (const row of data ?? []) {
    const client = (Array.isArray(row.clients) ? row.clients[0] : row.clients) as
      | { name?: string; domain?: string | null }
      | null;
    const house = (client?.name || "").toLowerCase() === DIGISOL_HOUSE_NAME.toLowerCase();
    const ids = mergeIds(
      {
        ga4PropertyId: row.ga4_property_id,
        searchConsoleSite: row.search_console_site,
        adsCustomerId: row.ads_customer_id,
      },
      house ? houseDefaults() : EMPTY_IDS,
    );
    if (!ids.ga4PropertyId && !ids.searchConsoleSite && !ids.adsCustomerId) continue;
    try {
      const previous = (row.audit as GoogleAudit | null) ?? null;
      const audit = await runGoogleAudit(ids, client?.domain);
      await saveGoogleAudit(db, row.client_id, audit);
      const before = new Set(
        (previous?.checks ?? []).filter((c) => c.status === "warn" || c.status === "fail").map((c) => c.id),
      );
      const stillBad = new Set(audit.checks.filter((c) => c.status === "warn" || c.status === "fail").map((c) => c.id));
      digest.push({
        name: client?.name || "Company",
        score: scoreAudit(audit),
        problems: newProblems(audit, previous),
        fixed: Array.from(before).filter((id) => !stillBad.has(id)).length,
      });
    } catch (e) {
      digest.push({
        name: client?.name || "Company",
        score: null,
        fixed: 0,
        problems: [
          { id: "audit_error", product: "ga4", title: "Weekly check failed", status: "fail", detail: errorMessage(e) },
        ],
      });
    }
  }
  const emailed = await sendWeeklyDigest(digest).catch(() => false);
  return { companies: digest.length, emailed };
}

/** Compact picture for Kaylev's analytics tools (reads the saved audit, no Google calls). */
export async function googleSetupForAgent(db: SupabaseClient, clientId: string) {
  const setup = await loadGoogleSetup(db, clientId).catch(() => null);
  if (!setup?.audit) {
    return { checked: false, note: "Google setup hasn't been checked yet. Run it in Hub → Google setup." };
  }
  return {
    checked: true,
    checkedAt: setup.audit.ranAt,
    setupScore: scoreAudit(setup.audit),
    connected: Object.fromEntries(
      (Object.keys(setup.audit.products) as GoogleProduct[]).map((p) => [PRODUCT_LABELS[p], setup.audit!.products[p].connected]),
    ),
    problems: setup.audit.checks
      .filter((c) => c.status === "warn" || c.status === "fail")
      .slice(0, 12)
      .map((c) => ({
        product: PRODUCT_LABELS[c.product],
        title: c.title,
        detail: c.detail,
        oneClickFix: Boolean(c.fix),
      })),
    search: setup.audit.search ?? null,
    ads: setup.audit.ads ?? null,
    note: "Fixes are applied by the owner in Hub → Google setup. Never claim a fix was applied.",
  };
}
