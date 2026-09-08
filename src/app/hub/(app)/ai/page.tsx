import { AiImageForm } from "@/components/hub/AiImageForm";
import { createClient } from "@/lib/supabase/server";

export default async function AiPage() {
  const supabase = await createClient();
  const { data: posters } = await supabase
    .from("assets")
    .select("*")
    .eq("bucket", "ai-posters")
    .order("created_at", { ascending: false })
    .limit(12);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-white">AI posters</h1>
        <p className="mt-1 text-sm text-zinc-400">
          OpenAI image generation runs on the server. Files land in the ai-posters
          bucket so you can drop them into email templates.
        </p>
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
