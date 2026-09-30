import { headers } from "next/headers";
import { AnalyticsDashboard } from "@/components/AnalyticsDashboard";
import { CopySnippet } from "@/components/hub/CopySnippet";
import { GoogleAdsPanel } from "@/components/hub/GoogleAdsPanel";
import { GoogleReviewsPanel } from "@/components/hub/GoogleReviewsPanel";
import { MetaAdsPanel } from "@/components/hub/MetaAdsPanel";
import { InstagramInsightsPanel } from "@/components/hub/InstagramInsightsPanel";
import { WebsiteAuditPanel } from "@/components/hub/WebsiteAuditPanel";
import { getOutboundSiteUrl } from "@/lib/supabase/env";
import { WorkspaceScope } from "@/components/hub/WorkspaceScope";
import { DemographicsPanel } from "@/components/hub/DemographicsPanel";
import {
  emptyGa4Demographics,
  emptyGa4Insights,
  companyGa4PropertyId,
  fetchGa4Demographics,
  fetchGa4Insights,
  fetchGa4Summary,
  ga4StatusFor,
  gaRange,
  type Ga4Summary,
} from "@/lib/ga4";
import { Ga4InsightsPanel } from "@/components/hub/Ga4InsightsPanel";
import {
  LEAD_STAGES,
  type LeadRecord,
  summarizeLeadPerformance,
} from "@/lib/lead-pipeline";
import { DIGISOL_HOUSE_NAME } from "@/lib/branding";
import { loadContentTests, type ContentTestLoad } from "@/lib/contentTestData";
import { emptyReviewSummary, loadReviewSummary } from "@/lib/googleReviews";
import { fetchAnalyticsEventsSummary } from "@/lib/analyticsEvents";
import { reconcileHubEmailStats } from "@/lib/resendStats";
import {
  emptyMetaAdsSummary,
  fetchMetaAdsSummary,
} from "@/lib/meta/insights";
import {
  emptyInstagramInsights,
  fetchInstagramInsights,
} from "@/lib/meta/instagramInsights";
import { contactIdsForClient, getWorkspaceClient } from "@/lib/workspace";
import { newSiteKey, summarizeSiteEvents, trackingSnippet } from "@/lib/site-analytics";
import { GOOGLE_ADS_CONVERSIONS, GOOGLE_ADS_ID, GOOGLE_ADS_LABELS } from "@/lib/ads";
import { createClient } from "@/lib/supabase/server";

function hubOrigin(headerStore: Headers) {
  const host = headerStore.get("x-forwarded-host") || headerStore.get("host");
  if (!host) return "";
  const proto = headerStore.get("x-forwarded-proto") || "https";
  return `${proto}://${host}`;
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams?: { range?: string | string[] };
}) {
  const gaDays = gaRange(searchParams?.range);
  const supabase = await createClient();
  const headerStore = await headers();
  const origin = hubOrigin(headerStore);
  // Fall back to DigiSol house when Working-on cookie is missing/stale —
  // otherwise GA4/Meta cards render as "0 / No signal" with env configured.
  let active = await getWorkspaceClient(supabase);
  const scopedIds = active ? await contactIdsForClient(supabase, active.id) : null;
  const isDigisol =
    (active?.name || "").toLowerCase() === DIGISOL_HOUSE_NAME.toLowerCase();
  const ga4PropertyId = await companyGa4PropertyId(supabase, active?.id, isDigisol);
  const gaStatus = ga4StatusFor(ga4PropertyId);

  if (active && !active.site_key) {
    const siteKey = newSiteKey();
    const { error } = await supabase
      .from("clients")
      .update({ site_key: siteKey })
      .eq("id", active.id);
    if (!error) active = { ...active, site_key: siteKey };
  }

  let contactsQuery = supabase.from("contacts").select("id", { count: "exact", head: true });
  let unsubQuery = supabase
    .from("contacts")
    .select("id", { count: "exact", head: true })
    .not("unsubscribed_at", "is", null);

  if (active) {
    contactsQuery = contactsQuery.eq("client_id", active.id);
    unsubQuery = unsubQuery.eq("client_id", active.id);
  }

  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  let siteQuery = supabase
    .from("site_events")
    .select("client_id, visitor_id, host, path, title, referrer, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(800);
  if (active) siteQuery = siteQuery.eq("client_id", active.id);

  let leadsQuery = supabase
    .from("leads")
    .select(
      "id, source, stage, estimated_value, actual_value, first_touch_at, closed_at, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(500);
  if (active) leadsQuery = leadsQuery.eq("client_id", active.id);

  const emptyGa4: Ga4Summary = {
    configured: false,
    sessions: 0,
    users: 0,
    pageviews: 0,
    daily: [],
    pages: [],
    locations: [],
    sources: [],
    googleAds: { sessions: 0, campaigns: [] },
  };

  const emptyAgent = {
    total: 0,
    successRate: 0,
    tokenCost: 0,
    byType: [] as { label: string; value: number }[],
    byChannel: [] as { label: string; value: number }[],
    daily: [] as { day: string; value: number }[],
    weakPoints: [] as { label: string; value: number }[],
  };

  const withTimeout = <T,>(promise: Promise<T>, ms: number, fallback: T) =>
    Promise.race([
      promise.catch(() => fallback),
      new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
    ]);

  const contentTestsPromise = withTimeout(
    loadContentTests(supabase, active?.id ?? null, {
      useGa4: isDigisol && gaStatus.ready,
      limit: 6,
    }),
    8000,
    { tests: [], gaConfigured: false } as ContentTestLoad,
  );
  const reviewsPromise = withTimeout(
    loadReviewSummary(supabase, active?.id ?? null),
    5000,
    emptyReviewSummary(),
  );

  const ga4TimeoutFallback: Ga4Summary = {
    ...emptyGa4,
    configured: true,
    error:
      "Analytics timed out loading Google data — first-party DigiSol stats below still load. Refresh to retry.",
  };

  // One reconciler for Performance + Hub cards (light sync + Resend fallback).
  // Time-box slow external calls so the page always paints first-party data.
  const [contacts, unsubscribed, site, leadsResult, ga4, gaInsights, latestAudit, email, agentEvents, metaAds, instagram, demographics] =
    await Promise.all([
      contactsQuery,
      unsubQuery,
      siteQuery,
      leadsQuery,
      withTimeout(
        gaStatus.ready
          ? fetchGa4Summary(ga4PropertyId, gaDays)
          : Promise.resolve(emptyGa4),
        7000,
        ga4TimeoutFallback,
      ),
      gaStatus.ready
        ? withTimeout(
            fetchGa4Insights(ga4PropertyId, gaDays),
            8000,
            emptyGa4Insights(gaDays, {
              configured: true,
              error: "Timed out loading Google data. Refresh to retry.",
            }),
          )
        : Promise.resolve(emptyGa4Insights(gaDays)),
      active
        ? withTimeout(
            (async () => {
              const { data } = await supabase
                .from("website_audits")
                .select(
                  "id, url, final_url, score, ttfb_ms, total_ms, report, created_at",
                )
                .eq("client_id", active.id)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();
              return { data };
            })(),
            4000,
            { data: null },
          )
        : Promise.resolve({ data: null }),
      withTimeout(
        reconcileHubEmailStats(supabase, scopedIds, { accountMetrics: isDigisol }),
        6000,
        {
          sends: 0,
          opened: 0,
          clicked: 0,
          openRate: 0,
          clickRate: 0,
          engagementSource: "hub" as const,
          synced: 0,
          resend: {
            configured: false,
            days: 14,
            sent: 0,
            delivered: 0,
            opened: 0,
            uniqueOpened: 0,
            clicked: 0,
            uniqueClicked: 0,
            bounced: 0,
            openRate: null,
            clickRate: null,
          },
        },
      ),
      withTimeout(
        fetchAnalyticsEventsSummary(supabase, {
          companyId: active?.id ?? null,
          days: 14,
        }),
        4000,
        emptyAgent,
      ),
      // Meta and Instagram tokens are DigiSol's accounts.
      isDigisol
        ? withTimeout(fetchMetaAdsSummary(14), 8000, emptyMetaAdsSummary(14))
        : Promise.resolve(emptyMetaAdsSummary(14)),
      isDigisol
        ? withTimeout(fetchInstagramInsights(), 8000, emptyInstagramInsights())
        : Promise.resolve(emptyInstagramInsights()),
      gaStatus.ready
        ? withTimeout(
            fetchGa4Demographics(ga4PropertyId, 28),
            7000,
            emptyGa4Demographics({
              configured: true,
              error: "Timed out loading Google data. Refresh to retry.",
            }),
          )
        : Promise.resolve(emptyGa4Demographics()),
    ]);

  const contentTests = await contentTestsPromise;
  const reviews = await reviewsPromise;
  const website = summarizeSiteEvents(site.data ?? [], active?.domain);
  const maxDaily = Math.max(1, ...website.daily.map((item) => item.count));
  const pipeline = summarizeLeadPerformance((leadsResult.data ?? []) as LeadRecord[]);
  const maxStage = Math.max(1, ...LEAD_STAGES.map((stage) => pipeline.byStage[stage.id]));
  const money = (value: number) =>
    new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
      maximumFractionDigits: 0,
    }).format(value);
  const sendCount = email.sends;
  const openCount = email.opened;
  const clickCount = email.clicked;
  const openRate = email.openRate;
  const clickRate = email.clickRate;
  const resend = email.resend;
  const cards = [
    { label: "Contacts", value: contacts.count ?? 0 },
    { label: "Emails sent", value: sendCount },
    { label: "Opens", value: openCount },
    { label: "Clicks", value: clickCount },
    { label: "Unsubscribed", value: unsubscribed.count ?? 0 },
  ];
  // Only real failed agent events. Pageview counts belong in Top pages —
  // using them here made the busiest URLs look like failing scores.
  const weakPoints = agentEvents.weakPoints;
  const topPages = (
    gaStatus.ready && !ga4.error && ga4.pages.length > 0
      ? ga4.pages.map((page) => ({ label: page.label, value: page.pageviews }))
      : website.pages.map((page) => ({ label: page.label, value: page.count }))
  ).slice(0, 8);
  const topSources = (
    gaStatus.ready && !ga4.error && ga4.sources.length > 0
      ? ga4.sources.map((row) => ({ label: row.label, value: row.sessions }))
      : website.referrers.map((row) => ({ label: row.label, value: row.count }))
  ).slice(0, 8);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-white">Analytics</h1>
        <WorkspaceScope companyName={active?.name} noun="metrics" />
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          Hub home for performance. Add people under Contacts (with lead
          source/tags). Overview and the old Leads board redirect here or to
          Contacts so nothing is duplicated in the menu.
        </p>
      </div>

      <section className="space-y-4">
        {isDigisol ? (
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">
                DigiSol Google Analytics
              </h2>
              <p className="mt-1 text-sm text-zinc-400">
                Live GA4 numbers for wwwdigisol.com (last {gaDays} days) — on-page SEO,
                city landers, Dispatch, and CRO traffic in one place.
              </p>
            </div>
            <a
              href="https://analytics.google.com/"
              className="text-sm text-indigo-400 hover:text-indigo-300"
              target="_blank"
              rel="noreferrer"
            >
              Open Google Analytics
            </a>
          </div>
        ) : (
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">Performance</h2>
              <p className="mt-1 text-sm text-zinc-400">
                {active?.name || "This company"}&apos;s numbers for the last {gaStatus.ready ? gaDays : 14} days:
                {gaStatus.ready ? " its Google Analytics," : ""} visits from the Hub
                tracker, email, leads, and Kaylev. Only this company&apos;s data shows here.
                {gaStatus.ready ? null : " Connect its GA4 property in Google setup to add Google Analytics."}
              </p>
            </div>
            <a href="/hub/google" className="text-sm text-indigo-400 hover:text-indigo-300">
              Google setup
            </a>
          </div>
        )}

        {!isDigisol && !gaStatus.ready ? null : !gaStatus.ready ? (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm text-amber-100/90">
            <p className="font-medium text-amber-50">Connect the GA4 Data API</p>
            <p className="mt-2 text-amber-100/80">
              The public site already sends hits to{" "}
              <code className="text-amber-50">G-4ZBG4VPC9C</code>. To pull those
              stats into DigiSol Hub, add these Vercel Production secrets, then
              grant the service account Viewer on that GA4 property:
            </p>
            <ul className="mt-3 list-inside list-disc space-y-1 text-amber-100/80">
              <li>
                <code className="text-amber-50">GA4_PROPERTY_ID</code> — numeric
                property ID (Admin → Property settings), not the G- measurement ID
              </li>
              <li>
                <code className="text-amber-50">GA4_CLIENT_EMAIL</code> — Google
                Cloud service account email
              </li>
              <li>
                <code className="text-amber-50">GA4_PRIVATE_KEY</code> — service
                account private key (keep newlines as{" "}
                <code className="text-amber-50">\n</code>)
              </li>
            </ul>
            <p className="mt-3 text-amber-100/70">
              Until that is set, DigiSol pageviews still collect first-party below
              (Working on → DigiSol). City landers start showing as soon as they
              get traffic.
            </p>
          </div>
        ) : ga4.error ? (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5 text-sm text-rose-100">
            Could not load GA4: {ga4.error}
          </div>
        ) : null}

        {gaStatus.ready ? <Ga4InsightsPanel data={gaInsights} basePath="/hub/analytics" /> : null}

        {isDigisol ? (
        <GoogleAdsPanel
          days={gaDays}
          configured={gaStatus.ready && !ga4.error}
          sessions={ga4.googleAds.sessions}
          landings={isDigisol ? website.googleAdsPageviews : 0}
          campaigns={ga4.googleAds.campaigns}
          adsTagReady={Boolean(GOOGLE_ADS_ID)}
          conversions={GOOGLE_ADS_CONVERSIONS.map((row) => ({
            ...row,
            ready: Boolean(GOOGLE_ADS_ID && GOOGLE_ADS_LABELS[row.kind]),
            count: !isDigisol
              ? null
              : row.kind === "consult"
                ? website.conversionPageviews.consult
                : row.kind === "purchase"
                  ? website.conversionPageviews.purchase
                  : row.kind === "chat_lead"
                    ? (leadsResult.data ?? []).filter(
                        (lead) =>
                          lead.source === "visitor_chat" &&
                          String(lead.created_at) >= since,
                      ).length
                    : null,
          }))}
        />
        ) : null}

        <AnalyticsDashboard
          companyName={active?.name}
          gaConfigured={gaStatus.ready}
          gaError={ga4.error}
          gaDays={gaDays}
          traffic={{
            sessions: ga4.sessions,
            users: ga4.users,
            pageviews: ga4.pageviews,
            daily: ga4.daily.map((item) => ({
              day: item.day,
              value: item.sessions,
            })),
          }}
          firstParty={{
            pageviews: website.pageviews,
            visitors: website.visitors,
            daily: website.daily.map((item) => ({
              day: item.day,
              value: item.count,
            })),
          }}
          conversion={{
            openRate,
            clickRate,
            sends: sendCount,
            opens: openCount,
            clicks: clickCount,
            winRate: pipeline.winRate,
            pipelineOpen: pipeline.open,
            pipelineWon: pipeline.won,
          }}
          agentActivity={{
            total: agentEvents.total,
            successRate: agentEvents.successRate,
            tokenCost: agentEvents.tokenCost,
            byType: agentEvents.byType,
            byChannel: agentEvents.byChannel,
            daily: agentEvents.daily,
          }}
          weakPoints={weakPoints}
          topPages={topPages}
          topSources={topSources}
        />

        {isDigisol ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
          <h3 className="text-sm font-semibold text-white">City landers (GA4)</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {!gaStatus.ready || ga4.locations.length === 0 ? (
              <li className="text-zinc-500">
                No /locations traffic yet — Calgary, Edmonton, Red Deer,
                Cochrane, Airdrie appear here after visits.
              </li>
            ) : (
              ga4.locations.map((row) => (
                <li key={row.label} className="flex min-w-0 items-baseline justify-between gap-3">
                  <span className="min-w-0 flex-1 truncate text-zinc-300" title={row.label}>
                    {row.label}
                  </span>
                  <span className="shrink-0 tabular-nums text-zinc-500">{row.pageviews}</span>
                </li>
              ))
            )}
          </ul>
        </div>
        ) : null}
      </section>

      {gaStatus.ready ? (
        <DemographicsPanel days={28} data={demographics} domain={active?.domain} />
      ) : null}

      {contentTests.tests.length > 0 ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">
                Social, ad &amp; poster A/B tests
              </h2>
              <p className="mt-1 text-sm text-zinc-400">
                Visits, conversions, and leads from each variant&apos;s tracking
                links, plus ad numbers entered in Campaigns.
              </p>
            </div>
            <a href="/hub/campaigns" className="text-sm text-indigo-400 hover:text-indigo-300">
              Manage in Campaigns
            </a>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-zinc-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-900/60 text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Test</th>
                  <th className="px-4 py-3 font-medium">Variant A</th>
                  <th className="px-4 py-3 font-medium">Variant B</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {contentTests.tests.map((item) => (
                  <tr key={item.test.id}>
                    <td className="px-4 py-3 text-white">{item.test.name}</td>
                    {item.results.map((result) => {
                      const label = item.variants.find((v) => v.variant === result.variant)?.label;
                      return (
                        <td key={result.variant} className="px-4 py-3 text-zinc-300">
                          <span className="block text-xs text-zinc-500">{label}</span>
                          {result.totals.sessions} visits · {result.totals.keyEvents} conv. ·{" "}
                          {result.totals.leads} leads
                          {result.totals.clicks ? ` · ${result.totals.clicks} clicks` : ""}
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 text-zinc-400">
                      {item.test.winner_variant
                        ? `Winner: ${item.test.winner_variant}`
                        : item.leader.note}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <GoogleReviewsPanel
        key={active?.id ?? "none"}
        companyName={active?.name}
        initial={reviews}
      />

      <WebsiteAuditPanel
        key={active?.id ?? "none"}
        companyName={active?.name}
        domain={active?.domain}
        awardBaseUrl={getOutboundSiteUrl()}
        initialAudit={
          "data" in latestAudit ? latestAudit.data : latestAudit
        }
      />

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-white">
          {isDigisol ? "DigiSol first-party website" : "Website"}
        </h2>
        <p className="text-sm text-zinc-400">
          {isDigisol
            ? "Pageviews DigiSol Hub records directly on wwwdigisol.com (including new city landers)."
            : "First-party pageviews for the company you are Working on — install the snippet on that client site."}
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
            <p className="text-sm text-zinc-400">Pageviews (14 days)</p>
            <p className="mt-2 text-3xl font-semibold text-white">{website.pageviews}</p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
            <p className="text-sm text-zinc-400">Visitors (14 days)</p>
            <p className="mt-2 text-3xl font-semibold text-white">{website.visitors}</p>
          </div>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
          <p className="text-sm text-zinc-400">Daily pageviews</p>
          <div className="mt-4 flex h-28 items-end gap-1">
            {website.daily.map((item) => (
              <div key={item.day} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t bg-indigo-500/80"
                  style={{ height: `${Math.max(6, (item.count / maxDaily) * 100)}%` }}
                  title={`${item.day}: ${item.count}`}
                />
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-zinc-500">
            <span>{website.daily[0]?.day}</span>
            <span>{website.daily.at(-1)?.day}</span>
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="min-w-0 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-white">Top pages</h3>
            <ul className="mt-3 space-y-2 text-sm">
              {website.pages.length === 0 ? (
                <li className="text-zinc-500">No pageviews yet.</li>
              ) : (
                website.pages.map((page) => (
                  <li key={page.label} className="flex min-w-0 items-baseline justify-between gap-3">
                    <span className="min-w-0 flex-1 truncate text-zinc-300" title={page.label}>
                      {page.label}
                    </span>
                    <span className="shrink-0 tabular-nums text-zinc-500">{page.count}</span>
                  </li>
                ))
              )}
            </ul>
          </div>
          <div className="min-w-0 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-white">Top referrers</h3>
            <ul className="mt-3 space-y-2 text-sm">
              {website.referrers.length === 0 ? (
                <li className="text-zinc-500">No referrers yet.</li>
              ) : (
                website.referrers.map((item) => (
                  <li key={item.label} className="flex min-w-0 items-baseline justify-between gap-3">
                    <span className="min-w-0 flex-1 truncate text-zinc-300" title={item.label}>
                      {item.label}
                    </span>
                    <span className="shrink-0 tabular-nums text-zinc-500">{item.count}</span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
          <h3 className="text-sm font-semibold text-white">Install on a client site</h3>
          {active?.site_key && origin ? (
            <>
              <p className="mt-2 text-sm text-zinc-400">
                Paste this once before <code className="text-zinc-200">&lt;/head&gt;</code> or{" "}
                <code className="text-zinc-200">&lt;/body&gt;</code> on the site you built for{" "}
                {active.name}. Pageviews show up here, scoped to this company.
                {isDigisol
                  ? " DigiSol’s public site already loads this automatically."
                  : null}
              </p>
              <div className="mt-4">
                <CopySnippet value={trackingSnippet(origin, active.site_key)} />
              </div>
            </>
          ) : (
            <p className="mt-2 text-sm text-zinc-400">
              Select a company under Working on to get that site&apos;s tracking snippet.
            </p>
          )}
        </div>
      </section>

      {isDigisol ? (
        <>
          <MetaAdsPanel summary={metaAds} />
          <InstagramInsightsPanel summary={instagram} />
        </>
      ) : null}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Lead pipeline</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {[
            { label: "Open leads", value: String(pipeline.open) },
            { label: "Won", value: String(pipeline.won) },
            { label: "Win rate", value: `${pipeline.winRate}%` },
            { label: "Pipeline value", value: money(pipeline.pipelineValue) },
            { label: "Avg days to close", value: String(pipeline.avgDaysToClose) },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5"
            >
              <p className="text-sm text-zinc-400">{card.label}</p>
              <p className="mt-2 text-3xl font-semibold text-white">{card.value}</p>
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
          <p className="text-sm text-zinc-400">Conversation funnel</p>
          <div className="mt-4 flex h-28 items-end gap-2">
            {LEAD_STAGES.map((stage) => (
              <div key={stage.id} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t bg-indigo-500/80"
                  style={{
                    height: `${Math.max(6, (pipeline.byStage[stage.id] / maxStage) * 100)}%`,
                  }}
                  title={`${stage.label}: ${pipeline.byStage[stage.id]}`}
                />
                <span className="truncate text-[10px] text-zinc-500">{stage.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
          <h3 className="text-sm font-semibold text-white">Source performance</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {pipeline.bySource.length === 0 ? (
              <li className="text-zinc-500">No field or website leads yet.</li>
            ) : (
              pipeline.bySource.map((row) => (
                <li key={row.id} className="flex min-w-0 items-baseline justify-between gap-3">
                  <span className="min-w-0 flex-1 truncate text-zinc-300" title={row.label}>
                    {row.label}
                  </span>
                  <span className="shrink-0 tabular-nums text-zinc-500">
                    {row.count} · {row.won} won
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Email engagement</h2>
        {resend.error ? (
          <p className="text-sm text-amber-200/90">
            Resend API: {resend.error}. Counts below use Hub sends when available;
            point the Resend webhook at{" "}
            <code className="text-amber-50">/api/webhooks/resend</code> and keep
            open tracking on. Hourly sync:{" "}
            <code className="text-amber-50">/api/cron/resend-sync</code>.
          </p>
        ) : (
          <p className="text-sm text-zinc-500">
            Same opens/clicks as Performance (reconciled Hub + Resend, last{" "}
            {resend.days} days
            {email.engagementSource === "resend"
              ? " · mirrored from Resend until webhook catches up"
              : email.synced > 0
                ? ` · synced ${email.synced} send${email.synced === 1 ? "" : "s"} from Resend`
                : ""}
            ). Open rate {openRate}% · click rate {clickRate}%.
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <div
              key={card.label}
              className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5"
            >
              <p className="text-sm text-zinc-400">{card.label}</p>
              <p className="mt-2 text-3xl font-semibold text-white">{card.value}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
