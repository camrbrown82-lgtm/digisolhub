import Link from "next/link";
import { NewWorkflowButton } from "@/components/hub/NewWorkflowButton";
import { createClient } from "@/lib/supabase/server";

export default async function WorkflowsPage() {
  const supabase = await createClient();
  const { data: workflows } = await supabase
    .from("workflows")
    .select("id, name, trigger, enabled, updated_at")
    .order("updated_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-white">Workflows</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Triggers and actions run on Inngest, not inside a single HTTP request.
          </p>
        </div>
        <NewWorkflowButton />
      </div>
      <ul className="divide-y divide-zinc-800 rounded-2xl border border-zinc-800">
        {(workflows ?? []).length === 0 ? (
          <li className="px-4 py-8 text-sm text-zinc-500">No workflows yet.</li>
        ) : (
          (workflows ?? []).map((workflow) => (
            <li key={workflow.id} className="flex items-center justify-between px-4 py-3">
              <Link href={`/hub/workflows/${workflow.id}`} className="text-white hover:text-indigo-300">
                {workflow.name}
              </Link>
              <span className="text-sm text-zinc-500">
                {workflow.trigger}
                {workflow.enabled ? " · on" : " · off"}
              </span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
