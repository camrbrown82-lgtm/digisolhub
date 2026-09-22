import { notFound } from "next/navigation";
import { HubBackButton } from "@/components/hub/HubBackButton";
import { WorkflowEditor } from "@/components/hub/WorkflowEditor";
import { createClient } from "@/lib/supabase/server";
import { resolveClientId } from "@/lib/workspace";

export default async function WorkflowDetailPage({
  params,
}: {
  params: { id: string };
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
    .select("id, email, name, tags")
    .order("created_at", { ascending: false })
    .limit(50);
  if (clientId) contactsQuery = contactsQuery.eq("client_id", clientId);

  let templatesQuery = supabase
    .from("email_templates")
    .select("id, name, subject")
    .order("updated_at", { ascending: false })
    .limit(40);
  if (clientId) templatesQuery = templatesQuery.eq("client_id", clientId);

  const [{ data: contacts }, { data: templates }] = await Promise.all([
    contactsQuery,
    templatesQuery,
  ]);

  const knownTags = Array.from(
    new Set(
      (contacts ?? []).flatMap((row) =>
        Array.isArray(row.tags) ? (row.tags as string[]) : [],
      ),
    ),
  ).sort();

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
        contacts={contacts ?? []}
        templates={templates ?? []}
        knownTags={knownTags}
      />
    </div>
  );
}
