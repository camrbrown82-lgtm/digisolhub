import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function ContactsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("contacts")
    .select("id, name, email, company, service, source, tags, unsubscribed_at, created_at")
    .order("created_at", { ascending: false });

  const contacts = data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-white">Contacts</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Leads from the consult form land here via /api/leads.
          </p>
        </div>
        <Link href="/hub/contacts/new" className="hub-btn">
          New contact
        </Link>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-zinc-800">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-zinc-900 text-zinc-400">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Company</th>
              <th className="px-4 py-3 font-medium">Service</th>
              <th className="px-4 py-3 font-medium">Source</th>
              <th className="px-4 py-3 font-medium">Tags</th>
            </tr>
          </thead>
          <tbody>
            {contacts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-zinc-500">
                  No contacts yet.
                </td>
              </tr>
            ) : (
              contacts.map((contact) => (
                <tr key={contact.id} className="border-t border-zinc-800">
                  <td className="px-4 py-3">
                    <Link
                      href={`/hub/contacts/${contact.id}`}
                      className="text-white hover:text-indigo-300"
                    >
                      {contact.name || "—"}
                    </Link>
                    {contact.unsubscribed_at ? (
                      <span className="ml-2 text-xs text-zinc-500">unsubscribed</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-zinc-300">{contact.email}</td>
                  <td className="px-4 py-3 text-zinc-400">{contact.company || "—"}</td>
                  <td className="px-4 py-3 text-zinc-400">{contact.service || "—"}</td>
                  <td className="px-4 py-3 text-zinc-400">{contact.source}</td>
                  <td className="px-4 py-3 text-zinc-400">
                    {(contact.tags ?? []).join(", ") || "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
