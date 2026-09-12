import { BrandForm } from "@/components/hub/BrandForm";
import { WorkspaceScope } from "@/components/hub/WorkspaceScope";
import { brandFromClient } from "@/lib/branding";
import { createClient } from "@/lib/supabase/server";
import { getActiveClient, getDigisolClient } from "@/lib/workspace";

export default async function BrandPage() {
  const supabase = await createClient();
  const active = (await getActiveClient(supabase)) ?? (await getDigisolClient(supabase));
  const { companyName, brand } = brandFromClient(active);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-white">Brand</h1>
        <WorkspaceScope companyName={active?.name} noun="brand settings" />
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          DigiSol is the house profile. Switch Working on to another company
          to keep their colors, voice, visual style, and notes separate.
          Emails, AI copy, and posters all read this kit.
        </p>
      </div>
      {active ? (
        <BrandForm
          clientId={active.id}
          companyName={companyName}
          domain={active.domain}
          brand={brand}
        />
      ) : (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 text-sm text-zinc-400">
          Could not create the DigiSol brand row. Run the branding migration
          in Supabase, then refresh.
        </div>
      )}
    </div>
  );
}
