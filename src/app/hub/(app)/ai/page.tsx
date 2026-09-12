import { AiImageForm } from "@/components/hub/AiImageForm";
import { WorkspaceScope } from "@/components/hub/WorkspaceScope";
import { brandFromClient } from "@/lib/branding";
import { createClient } from "@/lib/supabase/server";
import { getActiveClient, getDigisolClient } from "@/lib/workspace";

export default async function AiPage() {
  const supabase = await createClient();
  const selected = await getActiveClient(supabase);
  const brandSource = selected ?? (await getDigisolClient(supabase));
  const { companyName, brand } = brandFromClient(brandSource);
  let query = supabase
    .from("assets")
    .select("*")
    .eq("bucket", "ai-posters")
    .order("created_at", { ascending: false })
    .limit(12);
  if (selected) query = query.eq("client_id", selected.id);
  const { data: posters } = await query;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-white">AI posters</h1>
        <WorkspaceScope companyName={selected?.name} noun="posters" />
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          Describe the job of the poster. Color, tone, and visual style come
          from the selected company&apos;s{" "}
          <a href="/hub/brand" className="text-indigo-300 hover:text-indigo-200">
            Brand
          </a>{" "}
          kit — not a generic DigiSol look.
        </p>
      </div>
      <AiImageForm
        companyName={companyName}
        tagline={brand.tagline}
        voice={brand.voice}
        colors={[
          brand.primaryColor,
          brand.secondaryColor,
          brand.accentColor,
          brand.backgroundColor,
        ]}
      />
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
