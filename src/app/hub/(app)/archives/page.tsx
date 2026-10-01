import { PosterActions } from "@/components/hub/PosterActions";
import { PosterExport } from "@/components/hub/PosterExport";
import { HubBackButton } from "@/components/hub/HubBackButton";
import { WorkspaceScope } from "@/components/hub/WorkspaceScope";
import { brandFromClient } from "@/lib/branding";
import { listBusinessCardAssets, listPosterAssets } from "@/lib/posterArchive";
import { groupPosterSeries, parsePosterMeta, socialPackFromAsset } from "@/lib/posterSocial";
import { createClient } from "@/lib/supabase/server";
import { companySiteUrl, getActiveClient, getWorkspaceClient } from "@/lib/workspace";

export default async function ArchivesPage() {
  const supabase = await createClient();
  const selected = await getActiveClient(supabase);
  const brandSource = await getWorkspaceClient(supabase);
  const { companyName, brand } = brandFromClient(brandSource);
  const clientId = selected?.id || brandSource?.id;
  const posters = await listPosterAssets(supabase, {
    clientId,
    archived: true,
    limit: 60,
  });
  const cards = groupPosterSeries(
    await listBusinessCardAssets(supabase, { clientId, archived: true, limit: 40 }),
  );
  const siteUrl = companySiteUrl(brandSource);
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
      {cards.length > 0 ? (
        <section className="space-y-6">
          <h2 className="text-lg font-semibold text-white">Archived business cards</h2>
          {cards.map((sides) => (
            <div key={sides[0].id} className="space-y-3">
              <div className="grid gap-4 sm:grid-cols-2">
                {sides.map((side) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={side.id}
                    src={side.public_url ?? ""}
                    alt={side.filename ?? "Business card"}
                    className="rounded-xl border border-zinc-800"
                  />
                ))}
              </div>
              <PosterActions id={sides[0].id} archived noun="business card" />
              {parsePosterMeta(sides[0].notes)?.pdfUrl ? (
                <a
                  href={parsePosterMeta(sides[0].notes)?.pdfUrl}
                  className="text-sm text-indigo-300 hover:text-indigo-200"
                >
                  Open print PDF
                </a>
              ) : null}
            </div>
          ))}
        </section>
      ) : null}
      {groups.length === 0 && cards.length === 0 ? (
        <p className="rounded-2xl border border-zinc-800 px-4 py-8 text-sm text-zinc-500">
          Nothing archived yet. On AI posters, use Archive to move a generation here.
        </p>
      ) : groups.length > 0 ? (
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
      ) : null}
    </div>
  );
}
