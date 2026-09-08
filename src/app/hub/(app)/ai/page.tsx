import { AiImageForm } from "@/components/hub/AiImageForm";
import { WorkspaceScope } from "@/components/hub/WorkspaceScope";
import { createClient } from "@/lib/supabase/server";
import { getActiveClient } from "@/lib/workspace";

export default async function AiPage() {
  const supabase = await createClient();
  const active = await getActiveClient(supabase);
  let query = supabase
    .from("assets")
    .select("*")
    .eq("bucket", "ai-posters")
    .order("created_at", { ascending: false })
    .limit(12);
  if (active) query = query.eq("client_id", active.id);
  const { data: posters } = await query;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-white">AI posters</h1>
        <WorkspaceScope companyName={active?.name} noun="posters" />
      </div>
      <AiImageForm />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(posters ?? []).map((poster) => (
          <img
            key={poster.id}
            src={poster.public_url ?? ""}
            alt={poster.filename ?? "Poster"}
            className="rounded-xl border border-zinc-800"
          />
        ))}
      </div>
    </div>
  );
}
