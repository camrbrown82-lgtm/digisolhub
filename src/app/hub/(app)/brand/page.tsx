import { BrandForm } from "@/components/hub/BrandForm";
import { WorkspaceScope } from "@/components/hub/WorkspaceScope";
import { brandFromClient } from "@/lib/branding";
import { createClient } from "@/lib/supabase/server";
import { getActiveClient } from "@/lib/workspace";

export default async function BrandPage() {
  const supabase = await createClient();
  const active = await getActiveClient(supabase);
  const { companyName, brand } = brandFromClient(active);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-white">Brand</h1>
        <WorkspaceScope companyName={active?.name} noun="brand settings" />
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          This kit is used in email chrome, AI email copy, and AI posters for
          the company you have selected under Working on.
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
          Choose a company under Working on, then come back here. DigiSol
          defaults stay in place until a company kit is saved.
        </div>
      )}
    </div>
  );
}
