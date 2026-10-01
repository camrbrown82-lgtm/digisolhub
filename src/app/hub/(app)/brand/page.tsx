import { BrandForm } from "@/components/hub/BrandForm";
import { BusinessCardMaker } from "@/components/hub/BusinessCardMaker";
import { WorkspaceScope } from "@/components/hub/WorkspaceScope";
import { getBrandLogoUrl } from "@/lib/brandLogo";
import { brandFromClient } from "@/lib/branding";
import {
  DIGISOL_EMAIL,
  DIGISOL_FOUNDER,
  DIGISOL_FOUNDER_TITLE,
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
            defaults={{
              personName: house ? DIGISOL_FOUNDER : "",
              personTitle: house ? DIGISOL_FOUNDER_TITLE : "",
              phone: house ? DIGISOL_PHONE_DISPLAY : "",
              email: house ? DIGISOL_EMAIL : "",
              line: "",
            }}
          />
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
