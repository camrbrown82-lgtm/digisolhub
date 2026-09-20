import { BrandConsistencyNote } from "@/components/hub/BrandConsistencyNote";
import { BrandForm } from "@/components/hub/BrandForm";
import { WorkspaceScope } from "@/components/hub/WorkspaceScope";
import { getBrandLogoUrl } from "@/lib/brandLogo";
import { brandFromClient } from "@/lib/branding";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceClient } from "@/lib/workspace";

export default async function BrandPage() {
  const supabase = await createClient();
  const active = await getWorkspaceClient(supabase);
  const { companyName, brand } = brandFromClient(active);
  const logoUrl = active ? await getBrandLogoUrl(supabase, active) : "";

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
          <BrandConsistencyNote companyName={companyName} brand={brand} />
          <BrandForm
          clientId={active.id}
          companyName={companyName}
          domain={active.domain}
          brand={{ ...brand, logoUrl: brand.logoUrl || logoUrl }}
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
