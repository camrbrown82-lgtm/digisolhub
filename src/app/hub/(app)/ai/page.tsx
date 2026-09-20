import { AiImageForm } from "@/components/hub/AiImageForm";
import { PosterExport } from "@/components/hub/PosterExport";
import { WorkspaceScope } from "@/components/hub/WorkspaceScope";
import { getBrandLogoUrl } from "@/lib/brandLogo";
import { brandFromClient } from "@/lib/branding";
import { socialPackFromAsset } from "@/lib/posterSocial";
import { createClient } from "@/lib/supabase/server";
import { getOutboundSiteUrl } from "@/lib/supabase/env";
import { getActiveClient, getWorkspaceClient } from "@/lib/workspace";

export default async function AiPage() {
  const supabase = await createClient();
  const selected = await getActiveClient(supabase);
  const brandSource = await getWorkspaceClient(supabase);
  const { companyName, brand } = brandFromClient(brandSource);
  const logoUrl = brandSource ? await getBrandLogoUrl(supabase, brandSource) : brand.logoUrl;
  let query = supabase
    .from("assets")
    .select("*")
    .eq("bucket", "ai-posters")
    .order("created_at", { ascending: false })
    .limit(12);
  if (selected) query = query.eq("client_id", selected.id);
  else if (brandSource) query = query.eq("client_id", brandSource.id);
  const { data: posters } = await query;
  const siteUrl = getOutboundSiteUrl();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-white">AI posters</h1>
        <WorkspaceScope companyName={selected?.name || brandSource?.name} noun="posters" />
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          Color, type, and the official logo come from this company&apos;s{" "}
          <a href="/hub/brand" className="text-indigo-300 hover:text-indigo-200">
            Brand
          </a>{" "}
          kit. The model does not invent a wordmark — the saved logo is stamped
          on after generation. Then export to socials like Dispatch.
        </p>
      </div>
      <AiImageForm
        companyName={companyName}
        tagline={brand.tagline}
        voice={brand.voice}
        logoUrl={logoUrl}
        fonts={brand.fonts}
        colors={[
          brand.primaryColor,
          brand.secondaryColor,
          brand.accentColor,
          brand.backgroundColor,
        ]}
      />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {(posters ?? []).map((poster) => {
          const pack = socialPackFromAsset(poster, {
            companyName,
            tagline: brand.tagline,
            siteUrl,
          });
          return (
            <div key={poster.id} className="space-y-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={poster.public_url ?? ""}
                alt={poster.filename ?? "Poster"}
                className="rounded-xl border border-zinc-800"
              />
              {pack.url ? <PosterExport pack={pack} companyName={companyName} /> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
