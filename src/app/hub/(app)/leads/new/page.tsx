import { LeadForm } from "@/components/hub/LeadForm";
import { createClient } from "@/lib/supabase/server";
import { getActiveClientId, listClients } from "@/lib/workspace";

export default async function NewLeadPage() {
  const supabase = await createClient();
  const clients = await listClients(supabase);
  const defaultClientId = await getActiveClientId();

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-white">New lead</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Capture a door-to-door, event, referral, or other field conversation.
          Email is optional until you have it.
        </p>
      </div>
      <LeadForm clients={clients} defaultClientId={defaultClientId} />
    </div>
  );
}
