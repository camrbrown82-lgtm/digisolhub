import { WorkspaceScope } from "@/components/hub/WorkspaceScope";
import { createClient } from "@/lib/supabase/server";
import { contactIdsForClient, getActiveClient } from "@/lib/workspace";

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const active = await getActiveClient(supabase);
  const scopedIds = active ? await contactIdsForClient(supabase, active.id) : null;
  const emptySends = Boolean(active && scopedIds && scopedIds.length === 0);

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

  const [contacts, sends, opened, clicked, unsubscribed] = await Promise.all([
    contactsQuery,
    emptySends ? Promise.resolve({ count: 0 }) : sendsQuery,
    emptySends ? Promise.resolve({ count: 0 }) : openedQuery,
    emptySends ? Promise.resolve({ count: 0 }) : clickedQuery,
    unsubQuery,
  ]);

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
        <h2 className="font-semibold text-white">Google Analytics</h2>
        <p className="mt-2 text-zinc-400">
          DigiSol already sends pageviews to GA4 properties G-4ZBG4VPC9C and
          G-DCKSJLNE4T. Open GA4 for sessions, ads, and conversion paths — this
          hub does not rebuild that.
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
    </div>
  );
}
