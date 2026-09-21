import Link from "next/link";
import { ContactAbVariantSelect } from "@/components/hub/ContactAbVariantSelect";
import { ContactChannelSelect } from "@/components/hub/ContactChannelSelect";
import { ContactDeleteButton } from "@/components/hub/ContactDeleteButton";
import { ContactImportExport } from "@/components/hub/ContactImportExport";
import { WorkspaceScope } from "@/components/hub/WorkspaceScope";
import {
  CAMPAIGN_CHANNELS,
  CAMPAIGN_CHANNEL_LABELS,
  type CampaignChannel,
  normalizeCampaignChannel,
} from "@/lib/campaignChannels";
import {
  CONTACT_AB_VARIANTS,
  CONTACT_AB_VARIANT_LABELS,
  type ContactAbVariant,
  normalizeContactAbVariant,
} from "@/lib/contactAbVariants";
import { ensureCampaignChannelSchema } from "@/lib/ensureCampaignChannelSchema";
import { createClient } from "@/lib/supabase/server";
import { getActiveClient, resolveClientId } from "@/lib/workspace";

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: { channel?: string; ab?: string };
}) {
  await ensureCampaignChannelSchema().catch(() => null);
  const supabase = await createClient();
  const active = await getActiveClient(supabase);
  const clientId = (await resolveClientId(supabase)) || active?.id || "";
  const channelFilter = normalizeCampaignChannel(searchParams.channel);
  const abFilter = normalizeContactAbVariant(searchParams.ab);

  let query = supabase
    .from("contacts")
    .select(
      "id, name, email, company, phone, service, source, tags, unsubscribed_at, created_at, client_id, campaign_channel, ab_variant",
    )
    .order("created_at", { ascending: false });
  if (clientId) query = query.eq("client_id", clientId);
  if (channelFilter) query = query.eq("campaign_channel", channelFilter);
  if (abFilter) query = query.eq("ab_variant", abFilter);

  const { data, error } = await query;
  // Fallback if columns not migrated yet.
  let contacts = data ?? [];
  if (error) {
    let fallback = supabase
      .from("contacts")
      .select(
        "id, name, email, company, phone, service, source, tags, unsubscribed_at, created_at, client_id",
      )
      .order("created_at", { ascending: false });
    if (clientId) fallback = fallback.eq("client_id", clientId);
    const retry = await fallback;
    contacts = (retry.data ?? []).map((row) => ({
      ...row,
      campaign_channel: null,
      ab_variant: null,
    }));
  }

  function hrefFor(next: { channel?: string | null; ab?: string | null }) {
    const params = new URLSearchParams();
    const channel = next.channel === undefined ? channelFilter : next.channel;
    const ab = next.ab === undefined ? abFilter : next.ab;
    if (channel) params.set("channel", channel);
    if (ab) params.set("ab", ab);
    const qs = params.toString();
    return qs ? `/hub/contacts?${qs}` : "/hub/contacts";
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-white">Contacts</h1>
          <WorkspaceScope companyName={active?.name} noun="contacts" />
        </div>
        <Link href="/hub/contacts/new" className="hub-btn">
          New contact
        </Link>
      </div>

      <ContactImportExport />

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Channel
        </span>
        <Link
          href={hrefFor({ channel: null })}
          className={`rounded-full px-3 py-1 text-xs ${
            !channelFilter
              ? "bg-indigo-600 text-white"
              : "border border-zinc-700 text-zinc-300 hover:border-indigo-500"
          }`}
        >
          All
        </Link>
        {CAMPAIGN_CHANNELS.map((channel) => (
          <Link
            key={channel}
            href={hrefFor({ channel })}
            className={`rounded-full px-3 py-1 text-xs ${
              channelFilter === channel
                ? "bg-indigo-600 text-white"
                : "border border-zinc-700 text-zinc-300 hover:border-indigo-500"
            }`}
          >
            {CAMPAIGN_CHANNEL_LABELS[channel as CampaignChannel]}
          </Link>
        ))}
        <span className="ml-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          A/B
        </span>
        <Link
          href={hrefFor({ ab: null })}
          className={`rounded-full px-3 py-1 text-xs ${
            !abFilter
              ? "bg-indigo-600 text-white"
              : "border border-zinc-700 text-zinc-300 hover:border-indigo-500"
          }`}
        >
          All
        </Link>
        {CONTACT_AB_VARIANTS.map((variant) => (
          <Link
            key={variant}
            href={hrefFor({ ab: variant })}
            className={`rounded-full px-3 py-1 text-xs ${
              abFilter === variant
                ? "bg-indigo-600 text-white"
                : "border border-zinc-700 text-zinc-300 hover:border-indigo-500"
            }`}
          >
            {CONTACT_AB_VARIANT_LABELS[variant as ContactAbVariant]}
          </Link>
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-zinc-800">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-zinc-900 text-zinc-400">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Phone</th>
              <th className="px-4 py-3 font-medium">Company</th>
              <th className="px-4 py-3 font-medium">Channel</th>
              <th className="px-4 py-3 font-medium">A/B</th>
              <th className="px-4 py-3 font-medium">Service</th>
              <th className="px-4 py-3 font-medium">Tags</th>
              <th className="px-4 py-3 font-medium"> </th>
            </tr>
          </thead>
          <tbody>
            {contacts.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-zinc-500">
                  No contacts yet
                  {channelFilter || abFilter ? " for this filter" : ""}.
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
                  <td className="px-4 py-3 text-zinc-300">{contact.phone || "—"}</td>
                  <td className="px-4 py-3 text-zinc-400">{contact.company || "—"}</td>
                  <td className="px-4 py-3">
                    <ContactChannelSelect
                      contactId={contact.id}
                      value={contact.campaign_channel ?? null}
                      compact
                    />
                  </td>
                  <td className="px-4 py-3">
                    <ContactAbVariantSelect
                      contactId={contact.id}
                      value={contact.ab_variant ?? null}
                      compact
                    />
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{contact.service || "—"}</td>
                  <td className="px-4 py-3 text-zinc-400">
                    {(contact.tags ?? []).join(", ") || "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ContactDeleteButton
                      contactId={contact.id}
                      label="Delete"
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 px-2 py-1 text-xs text-rose-300 hover:bg-rose-500/10"
                    />
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
