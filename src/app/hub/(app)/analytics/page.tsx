import { createClient } from "@/lib/supabase/server";

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const [contacts, sends, opened, clicked, unsubscribed] = await Promise.all([
    supabase.from("contacts").select("id", { count: "exact", head: true }),
    supabase.from("sends").select("id", { count: "exact", head: true }),
    supabase.from("sends").select("id", { count: "exact", head: true }).not("opened_at", "is", null),
    supabase.from("sends").select("id", { count: "exact", head: true }).not("clicked_at", "is", null),
    supabase
      .from("contacts")
      .select("id", { count: "exact", head: true })
      .not("unsubscribed_at", "is", null),
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
        <p className="mt-1 text-sm text-zinc-400">
          Hub metrics from your CRM and Resend webhooks. Site traffic stays in GA4.
        </p>
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
