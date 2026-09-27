import { notFound } from "next/navigation";
import { HubBackButton } from "@/components/hub/HubBackButton";
import { WorkflowEditor } from "@/components/hub/WorkflowEditor";
import { parseAudiencePreset } from "@/lib/contactAudiences";
import {
  AUDITED_PROSPECT_STATUSES,
  isAuditedContact,
} from "@/lib/auditedContacts";
import { createClient } from "@/lib/supabase/server";
import { resolveClientId } from "@/lib/workspace";

export default async function WorkflowDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { audience?: string };
}) {
  const supabase = await createClient();
  const { data: workflow } = await supabase
    .from("workflows")
    .select("*")
    .eq("id", params.id)
    .single();
  if (!workflow) notFound();

  const clientId = await resolveClientId(supabase);

  let contactsQuery = supabase
    .from("contacts")
    .select("id, email, name, company, tags, source")
    .order("created_at", { ascending: false })
    .limit(200);
  if (clientId) contactsQuery = contactsQuery.eq("client_id", clientId);

  let templatesQuery = supabase
    .from("email_templates")
    .select("id, name, subject")
    .order("updated_at", { ascending: false })
    .limit(60);
  if (clientId) templatesQuery = templatesQuery.eq("client_id", clientId);

  let prospectsQuery = supabase
    .from("prospects")
    .select("contact_id")
    .not("contact_id", "is", null)
    .in("audit_status", [...AUDITED_PROSPECT_STATUSES])
    .limit(500);
  if (clientId) prospectsQuery = prospectsQuery.eq("client_id", clientId);

  const [{ data: contacts }, { data: templates }, { data: auditedProspects }] =
    await Promise.all([contactsQuery, templatesQuery, prospectsQuery]);

  const auditedIds = new Set(
    (auditedProspects ?? [])
      .map((row) => row.contact_id as string | null)
      .filter((id): id is string => Boolean(id)),
  );

  const contactIds = (contacts ?? []).map((row) => row.id as string);
  const { data: engagedSends } = contactIds.length
    ? await supabase
        .from("sends")
        .select("contact_id")
        .in("contact_id", contactIds)
        .or("opened_at.not.is.null,clicked_at.not.is.null")
        .limit(1000)
    : { data: [] as { contact_id: string | null }[] };
  const engagedIds = new Set(
    (engagedSends ?? [])
      .map((row) => row.contact_id as string | null)
      .filter((id): id is string => Boolean(id)),
  );

  const contactOptions = (contacts ?? []).map((row) => {
    const tags = Array.isArray(row.tags) ? (row.tags as string[]) : [];
    return {
      id: row.id as string,
      email: row.email as string,
      name: (row.name as string | null) ?? null,
      company: (row.company as string | null) ?? null,
      tags,
      source: (row.source as string | null) ?? null,
      audited: isAuditedContact({
        id: row.id as string,
        tags,
        source: (row.source as string | null) ?? null,
        auditedIds,
      }),
      engaged: engagedIds.has(row.id as string),
    };
  });

  const knownTags = Array.from(
    new Set(contactOptions.flatMap((row) => row.tags)),
  ).sort();

  const operatorEmails = String(process.env.HUB_ALLOWED_EMAIL || "")
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <HubBackButton href="/hub/campaigns" label="Back to campaigns" />
          <h1 className="mt-3 text-3xl font-semibold text-white">Edit workflow</h1>
        </div>
      </div>
      <WorkflowEditor
        workflow={workflow}
        contacts={contactOptions}
        templates={templates ?? []}
        knownTags={knownTags}
        operatorEmails={operatorEmails}
        initialAudience={parseAudiencePreset(searchParams?.audience)}
      />
    </div>
  );
}
