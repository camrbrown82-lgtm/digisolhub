import { PosterActions } from "@/components/hub/PosterActions";
import { PosterExport } from "@/components/hub/PosterExport";
import { HubBackButton } from "@/components/hub/HubBackButton";
import { WorkspaceScope } from "@/components/hub/WorkspaceScope";
import { brandFromClient } from "@/lib/branding";
import { listPosterAssets } from "@/lib/posterArchive";
import { groupPosterSeries, socialPackFromAsset } from "@/lib/posterSocial";
import { createClient } from "@/lib/supabase/server";
import { getOutboundSiteUrl } from "@/lib/supabase/env";
import { getActiveClient, getWorkspaceClient } from "@/lib/workspace";

export default async function ArchivesPage() {
  const supabase = await createClient();
  const selected = await getActiveClient(supabase);
  const brandSource = await getWorkspaceClient(supabase);
  const { companyName, brand } = brandFromClient(brandSource);
  const posters = await listPosterAssets(supabase, {
    clientId: selected?.id || brandSource?.id,
    archived: true,
    limit: 60,
  });
  const siteUrl = getOutboundSiteUrl();
  const groups = groupPosterSeries(posters);

  return (
    <div className="space-y-8">
      <div>
        <HubBackButton href="/hub/ai" label="Back to AI posters" />
        <h1 className="mt-3 text-3xl font-semibold text-white">Poster archives</h1>
        <WorkspaceScope companyName={selected?.name || brandSource?.name} noun="archives" />
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          Archived poster sets for this company. Restore them to AI posters or
          delete them for good.
        </p>
      </div>
      {groups.length === 0 ? (
        <p className="rounded-2xl border border-zinc-800 px-4 py-8 text-sm text-zinc-500">
          Nothing archived yet. On AI posters, use Archive to move a generation here.
        </p>
      ) : (
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
                <PosterActions id={slides[0].id} archived />
                {grouped.url ? <PosterExport pack={grouped} companyName={companyName} /> : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
