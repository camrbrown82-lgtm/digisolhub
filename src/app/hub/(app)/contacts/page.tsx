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

type ContactListRow = {
  id: string;
  name: string | null;
  email: string;
  company: string | null;
  phone: string | null;
  service: string | null;
  source: string | null;
  tags: string[] | null;
  unsubscribed_at: string | null;
  created_at: string;
  client_id: string | null;
  campaign_channel: string | null;
  ab_variant: string | null;
};

const SOURCE_FILTERS = [
  { id: "prospect_audit", label: "Prospect audits" },
  { id: "visitor_chat", label: "Chat leads" },
  { id: "prospect_audit_engaged", label: "Engaged audits" },
] as const;

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: { channel?: string; ab?: string; source?: string };
}) {
  const schema = await ensureCampaignChannelSchema().catch((err: unknown) => ({
    ok: false as const,
    error: err instanceof Error ? err.message : "Schema ensure failed",
  }));
  const supabase = await createClient();
  const active = await getActiveClient(supabase);
  const clientId = (await resolveClientId(supabase)) || active?.id || "";
  const channelFilter = normalizeCampaignChannel(searchParams.channel);
  const abFilter = normalizeContactAbVariant(searchParams.ab);
  const sourceFilter = SOURCE_FILTERS.some((s) => s.id === searchParams.source)
    ? (searchParams.source as (typeof SOURCE_FILTERS)[number]["id"])
    : null;

  async function loadContacts(includeChannelFields: boolean): Promise<{
    data: ContactListRow[] | null;
    error: { message: string } | null;
  }> {
    let next = supabase
      .from("contacts")
      .select(
        includeChannelFields
          ? "id, name, email, company, phone, service, source, tags, unsubscribed_at, created_at, client_id, campaign_channel, ab_variant"
          : "id, name, email, company, phone, service, source, tags, unsubscribed_at, created_at, client_id",
      )
      .order("created_at", { ascending: false });
    if (clientId) next = next.eq("client_id", clientId);
    if (includeChannelFields && channelFilter) {
      next = next.eq("campaign_channel", channelFilter);
    }
    if (includeChannelFields && abFilter) {
      next = next.eq("ab_variant", abFilter);
    }
    if (sourceFilter) {
      next = next.or(
        `source.eq.${sourceFilter},tags.cs.{"${sourceFilter}"}`,
      );
    }
    const result = await next;
    return {
      data: (result.data as ContactListRow[] | null) ?? null,
      error: result.error,
    };
  }

  let { data, error } = await loadContacts(true);
  if (error) {
    await ensureCampaignChannelSchema({ force: true }).catch(() => null);
    const retry = await loadContacts(true);
    data = retry.data;
    error = retry.error;
  }

  let contacts: ContactListRow[] = data ?? [];
  const schemaWarning = error
    ? error.message
    : !schema.ok
      ? schema.error
      : "";
  if (error) {
    const retry = await loadContacts(false);
    contacts = (retry.data ?? []).map((row) => ({
      ...row,
      campaign_channel: null,
      ab_variant: null,
    }));
  }

  function hrefFor(next: {
    channel?: string | null;
    ab?: string | null;
    source?: string | null;
  }) {
    const params = new URLSearchParams();
    const channel = next.channel === undefined ? channelFilter : next.channel;
    const ab = next.ab === undefined ? abFilter : next.ab;
    const source = next.source === undefined ? sourceFilter : next.source;
    if (channel) params.set("channel", channel);
    if (ab) params.set("ab", ab);
    if (source) params.set("source", source);
    const qs = params.toString();
    return qs ? `/hub/contacts?${qs}` : "/hub/contacts";
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-white">Contacts</h1>
          <WorkspaceScope companyName={active?.name} noun="contacts" />
          <p className="mt-2 max-w-2xl text-sm text-zinc-400">
            People and leads live here — set source, channel, A/B group, and
            tags on each contact. Counts and funnel stats are on Analytics.
          </p>
        </div>
        <Link href="/hub/contacts/new" className="hub-btn">
          New contact
        </Link>
      </div>

      <ContactImportExport />

      {schemaWarning ? (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Channel and A/B fields may not save yet: {schemaWarning}. Reload this
          page after a minute, or open a contact and save again.
        </div>
      ) : null}

      <p className="text-sm text-zinc-400">
        Channel and Test A/B are sticky contact fields — set them here anytime.
        Workflow/campaign tags are separate and get applied when automations
        run; edit tags on each contact&apos;s detail page.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Source
        </span>
        <Link
          href={hrefFor({ source: null })}
          className={`rounded-full px-3 py-1 text-xs ${
            !sourceFilter
              ? "bg-indigo-600 text-white"
              : "border border-zinc-700 text-zinc-300 hover:border-indigo-500"
          }`}
        >
          All
        </Link>
        {SOURCE_FILTERS.map((source) => (
          <Link
            key={source.id}
            href={hrefFor({ source: source.id })}
            className={`rounded-full px-3 py-1 text-xs ${
              sourceFilter === source.id
                ? "bg-indigo-600 text-white"
                : "border border-zinc-700 text-zinc-300 hover:border-indigo-500"
            }`}
          >
            {source.label}
          </Link>
        ))}
        <span className="ml-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
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
                  {channelFilter || abFilter || sourceFilter
                    ? " for this filter"
                    : ""}
                  .
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
