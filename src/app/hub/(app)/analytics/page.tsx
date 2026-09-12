import { headers } from "next/headers";
import { CopySnippet } from "@/components/hub/CopySnippet";
import { WorkspaceScope } from "@/components/hub/WorkspaceScope";
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

  const [contacts, sends, opened, clicked, unsubscribed, site] = await Promise.all([
    contactsQuery,
    emptySends ? Promise.resolve({ count: 0 }) : sendsQuery,
    emptySends ? Promise.resolve({ count: 0 }) : openedQuery,
    emptySends ? Promise.resolve({ count: 0 }) : clickedQuery,
    unsubQuery,
    siteQuery,
  ]);

  const website = summarizeSiteEvents(site.data ?? [], active?.domain);
  const maxDaily = Math.max(1, ...website.daily.map((item) => item.count));
  const cards = [
    { label: "Leads", value: contacts.count ?? 0 },
    { label: "Emails sent", value: sends.count ?? 0 },
    { label: "Opens (Resend)", value: opened.count ?? 0 },
    { label: "Clicks (Resend)", value: clicked.count ?? 0 },
    { label: "Unsubscribed", value: unsubscribed.count ?? 0 },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-white">Analytics</h1>
        <WorkspaceScope companyName={active?.name} noun="metrics" />
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Website</h2>
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
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 text-sm">
          <h3 className="font-semibold text-white">DigiSol Google Analytics</h3>
          <p className="mt-2 text-zinc-400">
            The public DigiSol site still reports to GA4. Client sites use the
            snippet above so each company stays separate in this hub.
          </p>
          <a
            href="https://analytics.google.com/"
            className="mt-4 inline-flex text-indigo-400 hover:text-indigo-300"
            target="_blank"
            rel="noreferrer"
          >
            Open Google Analytics
          </a>
        </div>
      </section>
    </div>
  );
}
