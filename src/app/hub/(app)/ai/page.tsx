import { AiImageForm } from "@/components/hub/AiImageForm";
import { PosterWithEditor } from "@/components/hub/ImageTextEditor";
import { PosterActions } from "@/components/hub/PosterActions";
import { PosterExport } from "@/components/hub/PosterExport";
import { WorkspaceScope } from "@/components/hub/WorkspaceScope";
import { getBrandLogoUrl } from "@/lib/brandLogo";
import { brandFromClient } from "@/lib/branding";
import { listPosterAssets } from "@/lib/posterArchive";
import { parseLayoutPieces } from "@/lib/layoutPieces";
import { groupPosterSeries, parsePosterMeta, socialPackFromAsset } from "@/lib/posterSocial";
import { createClient } from "@/lib/supabase/server";
import { companySiteUrl, getActiveClient, getWorkspaceClient } from "@/lib/workspace";

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
  const siteUrl = companySiteUrl(brandSource);
  const groups = groupPosterSeries(posters);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-white">AI posters</h1>
        <WorkspaceScope companyName={selected?.name || brandSource?.name} noun="posters" />
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          Paste a slide blueprint. The picture is artwork only. The words sit
          on top, so you can change them, and saving updates that same image.
          Colors, type, and the official logo come from this company&apos;s
          Brand kit. Switch Working on to brand another company the same way.
          Archive or delete a set when you are
          done. Older work lives on{" "}
          <a href="/hub/archives" className="text-indigo-300 hover:text-indigo-200">
            Archives
          </a>
          . Business cards are made on{" "}
          <a href="/hub/brand" className="text-indigo-300 hover:text-indigo-200">
            Brand
          </a>
          .
        </p>
      </div>
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
        canQr={Boolean(siteUrl)}
        siteUrl={siteUrl}
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
              <div className="grid gap-6 lg:grid-cols-2">
                {slides.map((poster) => {
                  const meta = parsePosterMeta(poster.notes);
                  return poster.public_url ? (
                    <PosterWithEditor
                      key={poster.id}
                      url={poster.public_url}
                      artUrl={meta?.artUrl}
                      pieces={parseLayoutPieces(meta?.pieces)}
                      alt={poster.filename ?? "Poster"}
                      color={brand.textColor}
                      logoUrl={logoUrl}
                      background={brand.backgroundColor}
                      highlight={brand.highlightColor}
                      siteUrl={siteUrl}
                      placeArtwork={meta?.artworkPlaced !== true}
                    />
                  ) : null;
                })}
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
