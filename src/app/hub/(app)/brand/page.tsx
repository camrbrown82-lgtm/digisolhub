import { BrandForm } from "@/components/hub/BrandForm";
import { BusinessCardMaker } from "@/components/hub/BusinessCardMaker";
import { PosterActions } from "@/components/hub/PosterActions";
import { WorkspaceScope } from "@/components/hub/WorkspaceScope";
import { ensureDigisolBadgeFiles } from "@/lib/digisolBadgeFiles";
import { getBrandLogoUrl } from "@/lib/brandLogo";
import { brandFromClient } from "@/lib/branding";
import { listBusinessCardAssets } from "@/lib/posterArchive";
import { groupPosterSeries, parsePosterMeta } from "@/lib/posterSocial";
import {
  DIGISOL_EMAIL,
  DIGISOL_FOUNDER,
  DIGISOL_PHONE_DISPLAY,
  isDigisolSiteUrl,
} from "@/lib/site";
import { createClient } from "@/lib/supabase/server";
import { companySiteUrl, getWorkspaceClient, isDigisolClient } from "@/lib/workspace";

export default async function BrandPage() {
  const supabase = await createClient();
  const active = await getWorkspaceClient(supabase);
  const { companyName, brand } = brandFromClient(active);
  const logoUrl = active ? await getBrandLogoUrl(supabase, active) : "";
  const siteUrl = companySiteUrl(active);
  const house = isDigisolClient(active);
  if (active && house) {
    await ensureDigisolBadgeFiles(supabase, active.id).catch((err) => {
      console.error("Could not save DigiSol badge files", err);
    });
  }
  const { data: awardRows } = active
    ? await supabase
        .from("assets")
        .select("public_url, filename, mime_type, notes")
        .eq("client_id", active.id)
        .like("notes", "digisol-badge:%")
        .order("created_at", { ascending: false })
        .limit(12)
    : { data: [] };
  const awardOrder = ["house", "site", "social", "gbp", "leader"];
  const awards = (awardRows ?? [])
    .filter((row) => String(row.mime_type || "").startsWith("image/") && row.public_url)
    .map((row) => ({
      url: String(row.public_url),
      label: String(row.filename || "Award"),
      role: "award" as const,
      key: String(row.notes || "").replace("digisol-badge:", ""),
    }))
    .sort((a, b) => awardOrder.indexOf(a.key) - awardOrder.indexOf(b.key));
  const emblem = brand.secondaryLogoUrl || "";
  const library = [
    logoUrl ? { url: logoUrl, label: "Logo", role: "logo" as const, selected: true } : null,
    emblem ? { url: emblem, label: "Logo badge", role: "emblem" as const, selected: true } : null,
    ...awards.map((item, index) => ({
      url: item.url,
      label: item.label,
      role: item.role,
      selected: index < 4,
    })),
  ].filter((item): item is { url: string; label: string; role: "logo" | "emblem" | "award"; selected: boolean } => Boolean(item));
  const cards = groupPosterSeries(
    await listBusinessCardAssets(supabase, { clientId: active?.id, archived: false }),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-white">Brand</h1>
        <WorkspaceScope companyName={active?.name} noun="brand settings" />
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          Fill this kit for whichever company is selected under Working on.
          Background, text, highlights, voice, and logo stay with that
          business. Emails, AI copy, and posters all read it — DigiSol house
          look never leaks into another company.
        </p>
      </div>
      {active ? (
        <>
          <BrandForm
            key={active.id}
            clientId={active.id}
            companyName={companyName}
            domain={active.domain}
            brand={{ ...brand, logoUrl: brand.logoUrl || logoUrl }}
          />
          <BusinessCardMaker
            key={active.id}
            companyName={companyName}
            siteReady={Boolean(siteUrl)}
            siteHint="Add a domain in the form above, save the kit, then make the card."
            scanNote={
              siteUrl && isDigisolSiteUrl(siteUrl)
                ? "On DigiSol's site, a scan opens Kaylev's free website audit."
                : "A scan opens this company's website."
            }
            library={library}
            defaults={{
              personName: house ? DIGISOL_FOUNDER : "",
              personTitle: "",
              phone: house ? DIGISOL_PHONE_DISPLAY : "",
              email: house ? DIGISOL_EMAIL : "",
              line: "",
            }}
          />
          {cards.length > 0 ? (
            <section className="space-y-6">
              <h2 className="text-lg font-semibold text-white">Saved cards</h2>
              {cards.map((sides) => {
                const pdfUrl = parsePosterMeta(sides[0].notes)?.pdfUrl;
                return (
                  <div key={sides[0].id} className="space-y-3">
                    <div className="grid gap-4 sm:grid-cols-2">
                      {sides.map((side, index) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={side.id}
                          src={side.public_url ?? ""}
                          alt={index === 0 ? `${companyName} business card front` : `${companyName} business card back`}
                          className="rounded-xl border border-zinc-800"
                        />
                      ))}
                    </div>
                    <PosterActions id={sides[0].id} noun="business card" />
                    {pdfUrl ? (
                      <a href={pdfUrl} className="text-sm text-indigo-300 hover:text-indigo-200">
                        Open print PDF
                      </a>
                    ) : null}
                  </div>
                );
              })}
            </section>
          ) : null}
        </>
      ) : (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 text-sm text-zinc-400">
          Could not create the DigiSol brand row. Run the branding migration
          in Supabase, then refresh.
        </div>
      )}
    </div>
  );
}
