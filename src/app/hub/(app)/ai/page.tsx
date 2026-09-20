import { AiImageForm } from "@/components/hub/AiImageForm";
import { BrandConsistencyNote } from "@/components/hub/BrandConsistencyNote";
import { PosterActions } from "@/components/hub/PosterActions";
import { PosterExport } from "@/components/hub/PosterExport";
import { WorkspaceScope } from "@/components/hub/WorkspaceScope";
import { getBrandLogoUrl } from "@/lib/brandLogo";
import { brandFromClient } from "@/lib/branding";
import { listPosterAssets } from "@/lib/posterArchive";
import { groupPosterSeries, socialPackFromAsset } from "@/lib/posterSocial";
import { createClient } from "@/lib/supabase/server";
import { getOutboundSiteUrl } from "@/lib/supabase/env";
import { getActiveClient, getWorkspaceClient } from "@/lib/workspace";

export default async function AiPage() {
  const supabase = await createClient();
  const selected = await getActiveClient(supabase);
  const brandSource = await getWorkspaceClient(supabase);
  const { companyName, brand } = brandFromClient(brandSource);
  const logoUrl = brandSource ? await getBrandLogoUrl(supabase, brandSource) : brand.logoUrl;
  const posters = await listPosterAssets(supabase, {
    clientId: selected?.id || brandSource?.id,
    archived: false,
  });
  const siteUrl = getOutboundSiteUrl();
  const groups = groupPosterSeries(posters);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-white">AI posters</h1>
        <WorkspaceScope companyName={selected?.name || brandSource?.name} noun="posters" />
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          Paste a slide blueprint. The generator typesets that copy on this
          company&apos;s Brand kit — background, text, and highlights — with
          the official logo on a bar above the art. Switch Working on to brand
          another company the same way. Archive or delete a set when you are
          done. Older work lives on{" "}
          <a href="/hub/archives" className="text-indigo-300 hover:text-indigo-200">
            Archives
          </a>
          .
        </p>
      </div>
      <BrandConsistencyNote companyName={companyName} brand={brand} />
      <AiImageForm
        companyName={companyName}
        tagline={brand.tagline}
        voice={brand.voice}
        logoUrl={logoUrl}
        fonts={brand.fonts}
        colors={[
          brand.backgroundColor,
          brand.textColor,
          brand.highlightColor,
          brand.primaryColor,
        ]}
      />
      <div className="space-y-10">
        {groups.map((slides) => {
          const pack = socialPackFromAsset(slides[0], {
            companyName,
            tagline: brand.tagline,
            siteUrl,
          });
          const urls = slides.map((slide) => slide.public_url).filter(Boolean) as string[];
          const grouped = {
            ...pack,
            urls: pack.urls?.length > 1 ? pack.urls : urls,
            url: pack.url || urls[0] || "",
          };
          return (
            <div key={slides[0].id} className="space-y-3">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {slides.map((poster) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={poster.id}
                    src={poster.public_url ?? ""}
                    alt={poster.filename ?? "Poster"}
                    className="rounded-xl border border-zinc-800"
                  />
                ))}
              </div>
              <PosterActions id={slides[0].id} />
              {grouped.url ? <PosterExport pack={grouped} companyName={companyName} /> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
