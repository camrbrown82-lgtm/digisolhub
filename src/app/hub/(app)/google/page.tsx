import { GoogleSetupPanel } from "@/components/hub/GoogleSetupPanel";
import { WorkspaceScope } from "@/components/hub/WorkspaceScope";
import { DIGISOL_HOUSE_NAME } from "@/lib/branding";
import { ensureGoogleSetupSchema } from "@/lib/ensureGoogleSetupSchema";
import { adsApiReady, managerCustomerId } from "@/lib/google/adsApi";
import { serviceAccountEmail, serviceAccountReady } from "@/lib/google/auth";
import { houseDefaults, loadGoogleSetup, recentGoogleFixes } from "@/lib/google/audit";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceClient } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export default async function GoogleSetupPage() {
  await Promise.race([
    ensureGoogleSetupSchema().catch(() => null),
    new Promise((resolve) => setTimeout(resolve, 3000)),
  ]);
  const supabase = await createClient();
  const active = await getWorkspaceClient(supabase);
  const isHouse = (active?.name || "").toLowerCase() === DIGISOL_HOUSE_NAME.toLowerCase();
  const [setup, fixes] = active
    ? await Promise.all([
        loadGoogleSetup(supabase, active.id, isHouse ? houseDefaults() : undefined),
        recentGoogleFixes(supabase, active.id).catch(() => []),
      ])
    : [null, []];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-white">Google setup</h1>
        <WorkspaceScope companyName={active?.name} noun="Google accounts" />
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          Checks this company&apos;s Google Analytics, Search Console and Google Ads every Monday,
          flags what&apos;s missing, and fixes it in one click when Google allows it. These
          accounts belong to this company only. Switch Working on to check another company.
        </p>
      </div>
      {active && setup ? (
        <GoogleSetupPanel
          key={active.id}
          companyName={active.name}
          domain={active.domain}
          initial={setup}
          initialFixes={fixes}
          robotEmail={serviceAccountEmail()}
          robotReady={serviceAccountReady()}
          adsReady={adsApiReady()}
          managerId={managerCustomerId()}
        />
      ) : (
        <p className="text-sm text-zinc-400">Pick a company under Working on first.</p>
      )}
    </div>
  );
}
