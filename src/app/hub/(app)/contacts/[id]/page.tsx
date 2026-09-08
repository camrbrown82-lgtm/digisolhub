import { notFound } from "next/navigation";
import { ContactForm } from "@/components/hub/ContactForm";
import { ContactNotes } from "@/components/hub/ContactNotes";
import { createClient } from "@/lib/supabase/server";

export default async function ContactDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();
  const { data: clients } = await supabase.from("clients").select("id, name").order("name");
  const { data: contact } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!contact) notFound();

  const { data: notes } = await supabase
    .from("notes")
    .select("id, body, created_at")
    .eq("contact_id", params.id)
    .order("created_at", { ascending: false });

  const { data: sends } = await supabase
    .from("sends")
    .select("id, status, created_at, opened_at")
    .eq("contact_id", params.id)
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-white">
          {contact.name || contact.email}
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Source {contact.source}
          {contact.unsubscribed_at ? " · unsubscribed" : ""}
        </p>
      </div>
      <ContactForm contactId={contact.id} initial={contact} clients={clients ?? []} />
      <section>
        <h2 className="mb-3 text-lg font-semibold text-white">Notes</h2>
        <ContactNotes contactId={contact.id} notes={notes ?? []} />
      </section>
      <section>
        <h2 className="mb-3 text-lg font-semibold text-white">Sends</h2>
        <ul className="space-y-2 text-sm text-zinc-400">
          {(sends ?? []).length === 0 ? (
            <li>No emails sent yet.</li>
          ) : (
            (sends ?? []).map((send) => (
              <li key={send.id}>
                {send.status} · {new Date(send.created_at).toLocaleString()}
                {send.opened_at ? " · opened" : ""}
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
