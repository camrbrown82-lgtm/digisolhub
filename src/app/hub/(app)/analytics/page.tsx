import { headers } from "next/headers";
import { CopySnippet } from "@/components/hub/CopySnippet";
import { WorkspaceScope } from "@/components/hub/WorkspaceScope";
import { fetchDigisolGa4Summary, ga4ConfigStatus } from "@/lib/ga4";
import {
  LEAD_STAGES,
  type LeadRecord,
  summarizeLeadPerformance,
} from "@/lib/lead-pipeline";
import { DIGISOL_HOUSE_NAME } from "@/lib/branding";
import { contactIdsForClient, getActiveClient } from "@/lib/workspace";
import { newSiteKey, summarizeSiteEvents, trackingSnippet } from "@/lib/site-analytics";
import { createClient } from "@/lib/supabase/server";

function hubOrigin(headerStore: Headers) {
  const host = headerStore.get("x-forwarded-host") || headerStore.get("host");
  if (!host) return "";
  const proto = headerStore.get("x-forwarded-proto") || "https";
  return `${proto}://${host}`;
}

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const headerStore = await headers();
  const origin = hubOrigin(headerStore);
  let active = await getActiveClient(supabase);
  const scopedIds = active ? await contactIdsForClient(supabase, active.id) : null;
  const emptySends = Boolean(active && scopedIds && scopedIds.length === 0);
  const isDigisol =
    (active?.name || "").toLowerCase() === DIGISOL_HOUSE_NAME.toLowerCase();

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
  let sendsQuery = supabase.from("sends").select("id", { count: "exact", head: true });
  let openedQuery = supabase
    .from("sends")
    .select("id", { count: "exact", head: true })
    .not("opened_at", "is", null);
  let clickedQuery = supabase
    .from("sends")
    .select("id", { count: "exact", head: true })
    .not("clicked_at", "is", null);

  if (active) {
    contactsQuery = contactsQuery.eq("client_id", active.id);
    unsubQuery = unsubQuery.eq("client_id", active.id);
    if (scopedIds && scopedIds.length > 0) {
      sendsQuery = sendsQuery.in("contact_id", scopedIds);
      openedQuery = openedQuery.in("contact_id", scopedIds);
      clickedQuery = clickedQuery.in("contact_id", scopedIds);
    }
  }

  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  let siteQuery = supabase
    .from("site_events")
    .select("client_id, visitor_id, host, path, title, referrer, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(4000);
  if (active) siteQuery = siteQuery.eq("client_id", active.id);

  let leadsQuery = supabase
    .from("leads")
    .select(
      "id, source, stage, estimated_value, actual_value, first_touch_at, closed_at, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(2000);
  if (active) leadsQuery = leadsQuery.eq("client_id", active.id);

  const [contacts, sends, opened, clicked, unsubscribed, site, leadsResult, ga4] =
    await Promise.all([
      contactsQuery,
      emptySends ? Promise.resolve({ count: 0 }) : sendsQuery,
      emptySends ? Promise.resolve({ count: 0 }) : openedQuery,
      emptySends ? Promise.resolve({ count: 0 }) : clickedQuery,
      unsubQuery,
      siteQuery,
      leadsQuery,
      fetchDigisolGa4Summary(14),
    ]);

  const website = summarizeSiteEvents(site.data ?? [], active?.domain);
  const maxDaily = Math.max(1, ...website.daily.map((item) => item.count));
  const maxGaDaily = Math.max(1, ...ga4.daily.map((item) => item.sessions));
  const pipeline = summarizeLeadPerformance((leadsResult.data ?? []) as LeadRecord[]);
  const maxStage = Math.max(1, ...LEAD_STAGES.map((stage) => pipeline.byStage[stage.id]));
  const money = (value: number) =>
    new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
      maximumFractionDigits: 0,
    }).format(value);
  const cards = [
    { label: "Contacts", value: contacts.count ?? 0 },
    { label: "Emails sent", value: sends.count ?? 0 },
    { label: "Opens (Resend)", value: opened.count ?? 0 },
    { label: "Clicks (Resend)", value: clicked.count ?? 0 },
    { label: "Unsubscribed", value: unsubscribed.count ?? 0 },
  ];
  const gaStatus = ga4ConfigStatus();

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
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">
              DigiSol Google Analytics
            </h2>
            <p className="mt-1 text-sm text-zinc-400">
              Live GA4 numbers for wwwdigisol.com (last 14 days) — on-page SEO,
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

        {!gaStatus.ready ? (
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

        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "Sessions (GA4)", value: ga4.sessions },
            { label: "Users (GA4)", value: ga4.users },
            { label: "Pageviews (GA4)", value: ga4.pageviews },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5"
            >
              <p className="text-sm text-zinc-400">{card.label}</p>
              <p className="mt-2 text-3xl font-semibold text-white">
                {gaStatus.ready && !ga4.error ? card.value : "—"}
              </p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
          <p className="text-sm text-zinc-400">Daily sessions (GA4)</p>
          <div className="mt-4 flex h-28 items-end gap-1">
            {ga4.daily.map((item) => (
              <div key={item.day} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t bg-blue-500/80"
                  style={{
                    height: `${Math.max(
                      6,
                      gaStatus.ready && !ga4.error
                        ? (item.sessions / maxGaDaily) * 100
                        : 6,
                    )}%`,
                  }}
                  title={`${item.day}: ${item.sessions}`}
                />
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-zinc-500">
            <span>{ga4.daily[0]?.day}</span>
            <span>{ga4.daily.at(-1)?.day}</span>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
            <h3 className="text-sm font-semibold text-white">Top pages (GA4)</h3>
            <ul className="mt-3 space-y-2 text-sm">
              {!gaStatus.ready || ga4.pages.length === 0 ? (
                <li className="text-zinc-500">No GA4 page data yet.</li>
              ) : (
                ga4.pages.map((page) => (
                  <li key={page.label} className="flex justify-between gap-3">
                    <span className="truncate text-zinc-300">{page.label}</span>
                    <span className="text-zinc-500">{page.pageviews}</span>
                  </li>
                ))
              )}
            </ul>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
            <h3 className="text-sm font-semibold text-white">
              City landers (GA4)
            </h3>
            <ul className="mt-3 space-y-2 text-sm">
              {!gaStatus.ready || ga4.locations.length === 0 ? (
                <li className="text-zinc-500">
                  No /locations traffic yet — Calgary, Edmonton, Red Deer,
                  Cochrane, Airdrie appear here after visits. Alberta visitors
                  are now routed to their city lander so these paths register in
                  GA4.
                </li>
              ) : (
                ga4.locations.map((row) => (
                  <li key={row.label} className="flex justify-between gap-3">
                    <span className="truncate text-zinc-300">{row.label}</span>
                    <span className="text-zinc-500">{row.pageviews}</span>
                  </li>
                ))
              )}
            </ul>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
            <h3 className="text-sm font-semibold text-white">
              Channels (GA4)
            </h3>
            <ul className="mt-3 space-y-2 text-sm">
              {!gaStatus.ready || ga4.sources.length === 0 ? (
                <li className="text-zinc-500">No channel data yet.</li>
              ) : (
                ga4.sources.map((row) => (
                  <li key={row.label} className="flex justify-between gap-3">
                    <span className="truncate text-zinc-300">{row.label}</span>
                    <span className="text-zinc-500">{row.sessions}</span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </section>

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
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
            <h3 className="text-sm font-semibold text-white">Top pages</h3>
            <ul className="mt-3 space-y-2 text-sm">
              {website.pages.length === 0 ? (
                <li className="text-zinc-500">No pageviews yet.</li>
              ) : (
                website.pages.map((page) => (
                  <li key={page.label} className="flex justify-between gap-3">
                    <span className="truncate text-zinc-300">{page.label}</span>
                    <span className="text-zinc-500">{page.count}</span>
                  </li>
                ))
              )}
            </ul>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
            <h3 className="text-sm font-semibold text-white">Top referrers</h3>
            <ul className="mt-3 space-y-2 text-sm">
              {website.referrers.length === 0 ? (
                <li className="text-zinc-500">No referrers yet.</li>
              ) : (
                website.referrers.map((item) => (
                  <li key={item.label} className="flex justify-between gap-3">
                    <span className="truncate text-zinc-300">{item.label}</span>
                    <span className="text-zinc-500">{item.count}</span>
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
                <li key={row.id} className="flex justify-between gap-3">
                  <span className="truncate text-zinc-300">{row.label}</span>
                  <span className="text-zinc-500">
                    {row.count} · {row.won} won
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Hub</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
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
