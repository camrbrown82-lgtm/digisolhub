import { notFound } from "next/navigation";
import { ContactDeleteButton } from "@/components/hub/ContactDeleteButton";
import { ContactForm } from "@/components/hub/ContactForm";
import { ContactNotes } from "@/components/hub/ContactNotes";
import { HubBackButton } from "@/components/hub/HubBackButton";
import { campaignChannelLabel } from "@/lib/campaignChannels";
import { contactAbVariantLabel } from "@/lib/contactAbVariants";
import { ensureCampaignChannelSchema } from "@/lib/ensureCampaignChannelSchema";
import { ensureProspectsSchema } from "@/lib/ensureProspectsSchema";
import { createClient } from "@/lib/supabase/server";

export default async function ContactDetailPage({
  params,
}: {
  params: { id: string };
}) {
  await Promise.all([
    ensureCampaignChannelSchema().catch(() => null),
    ensureProspectsSchema().catch(() => null),
  ]);
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
    .select("id, status, created_at, opened_at, clicked_at")
    .eq("contact_id", params.id)
    .order("created_at", { ascending: false })
    .limit(10);

  const { data: prospect } = await supabase
    .from("prospects")
    .select(
      "id, business_name, url, trade, contact_email, audit_status, audit_score, audit_summary, emailed_at, engaged_at, casl_status, last_audited_at",
    )
    .eq("contact_id", params.id)
    .order("last_audited_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <HubBackButton href="/hub/contacts" label="Back to contacts" />
          <h1 className="mt-3 text-3xl font-semibold text-white">
            {contact.name || contact.email}
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Source {contact.source}
            {contact.phone ? ` · ${contact.phone}` : ""}
            {contact.campaign_channel
              ? ` · ${campaignChannelLabel(contact.campaign_channel)}`
              : ""}
            {contact.ab_variant
              ? ` · ${contactAbVariantLabel(contact.ab_variant)}`
              : ""}
            {contact.unsubscribed_at ? " · unsubscribed" : ""}
          </p>
        </div>
        <ContactDeleteButton
          contactId={contact.id}
          label="Delete contact"
          redirectTo="/hub/contacts"
        />
      </div>

      {prospect ? (
        <section className="rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-5">
          <h2 className="text-lg font-semibold text-white">Prospect audit</h2>
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-zinc-500">Recipient</dt>
              <dd className="text-zinc-200">
                {prospect.contact_email || contact.email}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">Score</dt>
              <dd className="text-zinc-200">
                {prospect.audit_score != null
                  ? `${prospect.audit_score}/100`
                  : "—"}{" "}
                · {prospect.audit_status}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">Site</dt>
              <dd>
                <a
                  href={prospect.url}
                  className="text-indigo-300 hover:text-indigo-200"
                  target="_blank"
                  rel="noreferrer"
                >
                  {prospect.url}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">Trade / CASL</dt>
              <dd className="text-zinc-200">
                {prospect.trade} · {prospect.casl_status}
              </dd>
            </div>
          </dl>
          {prospect.audit_summary ? (
            <p className="mt-3 text-sm text-zinc-300">{prospect.audit_summary}</p>
          ) : null}
        </section>
      ) : null}

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
                {send.clicked_at ? " · clicked" : ""}
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
