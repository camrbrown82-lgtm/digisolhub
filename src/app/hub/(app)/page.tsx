import Link from "next/link";
import { WorkspaceScope } from "@/components/hub/WorkspaceScope";
import { createClient } from "@/lib/supabase/server";
import { contactIdsForClient, getActiveClient } from "@/lib/workspace";

export default async function HubHomePage() {
  let contacts = 0;
  let sends = 0;
  let opened = 0;
  let templates = 0;
  let recent: { id: string; name: string | null; email: string; created_at: string }[] = [];
  let companyName: string | null = null;

  try {
    const supabase = await createClient();
    const active = await getActiveClient(supabase);
    companyName = active?.name ?? null;
    const scopedIds = active ? await contactIdsForClient(supabase, active.id) : null;

    let contactsQuery = supabase.from("contacts").select("id", { count: "exact", head: true });
    let sendsQuery = supabase.from("sends").select("id", { count: "exact", head: true });
    let openedQuery = supabase
      .from("sends")
      .select("id", { count: "exact", head: true })
      .not("opened_at", "is", null);
    let templatesQuery = supabase
      .from("email_templates")
      .select("id", { count: "exact", head: true });
    let recentQuery = supabase
      .from("contacts")
      .select("id, name, email, created_at")
      .order("created_at", { ascending: false })
      .limit(6);

    if (active) {
      contactsQuery = contactsQuery.eq("client_id", active.id);
      templatesQuery = templatesQuery.eq("client_id", active.id);
      recentQuery = recentQuery.eq("client_id", active.id);
      if (scopedIds && scopedIds.length > 0) {
        sendsQuery = sendsQuery.in("contact_id", scopedIds);
        openedQuery = openedQuery.in("contact_id", scopedIds);
      }
    }

    const emptySends = Boolean(active && scopedIds && scopedIds.length === 0);
    const [c, s, o, t, r] = await Promise.all([
      contactsQuery,
      emptySends ? Promise.resolve({ count: 0 }) : sendsQuery,
      emptySends ? Promise.resolve({ count: 0 }) : openedQuery,
      templatesQuery,
      recentQuery,
    ]);
    contacts = c.count ?? 0;
    sends = s.count ?? 0;
    opened = o.count ?? 0;
    templates = t.count ?? 0;
    recent = r.data ?? [];
  } catch {
    // Hub still renders before Supabase env is wired.
  }

  const cards = [
    { label: "Contacts", value: contacts, href: "/hub/contacts" },
    { label: "Emails sent", value: sends, href: "/hub/email" },
    { label: "Opens recorded", value: opened, href: "/hub/analytics" },
    { label: "Templates", value: templates, href: "/hub/email" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-white">Overview</h1>
        <WorkspaceScope companyName={companyName} noun="work" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 transition hover:border-indigo-500/50"
          >
            <p className="text-sm text-zinc-400">{card.label}</p>
            <p className="mt-2 text-3xl font-semibold text-white">{card.value}</p>
          </Link>
        ))}
      </div>
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Recent leads</h2>
          <Link href="/hub/contacts" className="text-sm text-indigo-400 hover:text-indigo-300">
            View all
          </Link>
        </div>
        <ul className="mt-4 divide-y divide-zinc-800">
          {recent.length === 0 ? (
            <li className="py-6 text-sm text-zinc-500">No contacts yet.</li>
          ) : (
            recent.map((contact) => (
              <li key={contact.id} className="flex items-center justify-between py-3 text-sm">
                <Link href={`/hub/contacts/${contact.id}`} className="text-white hover:text-indigo-300">
                  {contact.name || contact.email}
                </Link>
                <span className="text-zinc-500">
                  {new Date(contact.created_at).toLocaleDateString()}
                </span>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
