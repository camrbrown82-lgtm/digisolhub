import { AiImageForm } from "@/components/hub/AiImageForm";
import { BusinessCardMaker } from "@/components/hub/BusinessCardMaker";
import { PosterActions } from "@/components/hub/PosterActions";
import { PosterExport } from "@/components/hub/PosterExport";
import { WorkspaceScope } from "@/components/hub/WorkspaceScope";
import { getBrandLogoUrl } from "@/lib/brandLogo";
import { brandFromClient } from "@/lib/branding";
import { listPosterAssets } from "@/lib/posterArchive";
import { groupPosterSeries, socialPackFromAsset } from "@/lib/posterSocial";
import {
  DIGISOL_EMAIL,
  DIGISOL_FOUNDER,
  DIGISOL_FOUNDER_TITLE,
  DIGISOL_PHONE_DISPLAY,
  isDigisolSiteUrl,
} from "@/lib/site";
import { createClient } from "@/lib/supabase/server";
import { companySiteUrl, getActiveClient, getWorkspaceClient, isDigisolClient } from "@/lib/workspace";

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
      />
      <BusinessCardMaker
        key={brandSource?.id || companyName}
        companyName={companyName}
        siteReady={Boolean(siteUrl)}
        siteHint="Add this company's domain on Brand first. The QR code needs a website to open."
        scanNote={
          siteUrl && isDigisolSiteUrl(siteUrl)
            ? "On DigiSol's site, a scan opens Kaylev's free website audit."
            : "A scan opens this company's website."
        }
        defaults={{
          personName: isDigisolClient(brandSource) ? DIGISOL_FOUNDER : "",
          personTitle: isDigisolClient(brandSource) ? DIGISOL_FOUNDER_TITLE : "",
          phone: isDigisolClient(brandSource) ? DIGISOL_PHONE_DISPLAY : "",
          email: isDigisolClient(brandSource) ? DIGISOL_EMAIL : "",
          line: "",
        }}
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
