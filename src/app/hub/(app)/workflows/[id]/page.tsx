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
    .is("unsubscribed_at", null)
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

  const runsQuery = supabase
    .from("workflow_runs")
    .select("id, status, started_at, finished_at, log, contacts(email, name, company)")
    .eq("workflow_id", params.id)
    .order("started_at", { ascending: false })
    .limit(100);

  const [
    { data: contacts },
    { data: templates },
    { data: auditedProspects },
    { data: runRows },
  ] = await Promise.all([contactsQuery, templatesQuery, prospectsQuery, runsQuery]);

  const runs = (runRows ?? []).map((row) => {
    const contact = (Array.isArray(row.contacts) ? row.contacts[0] : row.contacts) as
      | { email: string | null; name: string | null; company: string | null }
      | null;
    const log = Array.isArray(row.log) ? (row.log as string[]) : [];
    return {
      id: row.id as string,
      status: row.status as string,
      startedAt: row.started_at as string,
      who: contact?.company || contact?.name || contact?.email || "Removed contact",
      email: contact?.email ?? null,
      lastStep: log[log.length - 1] ?? "",
    };
  });
  const inProgress = runs.filter((run) => run.status === "running").length;

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
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold text-white">People in this workflow</h2>
          <p className="text-sm text-zinc-400">
            {inProgress} in progress · {runs.length} total
          </p>
        </div>
        <p className="mt-1 text-xs text-zinc-500">
          Everyone who has entered, whether a trigger started them or you clicked Run.
          Will run for above is only the list for your next manual Run.
        </p>
        {runs.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">Nobody has entered this workflow yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-zinc-800">
            {runs.map((run) => (
              <li key={run.id} className="flex flex-wrap items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm text-white">{run.who}</p>
                  <p className="truncate text-xs text-zinc-500">
                    {[run.email, `started ${new Date(run.startedAt).toLocaleString("en-CA")}`]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-zinc-300">
                    {run.status === "running" ? "in progress" : run.status}
                  </p>
                  {run.lastStep ? (
                    <p className="max-w-xs truncate text-xs text-zinc-500">{run.lastStep}</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
