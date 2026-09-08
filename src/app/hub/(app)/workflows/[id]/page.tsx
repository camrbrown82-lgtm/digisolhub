import { notFound } from "next/navigation";
import { WorkflowEditor } from "@/components/hub/WorkflowEditor";
import { createClient } from "@/lib/supabase/server";

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

  const { data: contacts } = await supabase
    .from("contacts")
    .select("id, email, name")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold text-white">Edit workflow</h1>
      <WorkflowEditor
        workflow={workflow}
        contacts={contacts ?? []}
      />
    </div>
  );
}
