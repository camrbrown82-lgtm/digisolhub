import { ContactForm } from "@/components/hub/ContactForm";
import { HubBackButton } from "@/components/hub/HubBackButton";
import { createClient } from "@/lib/supabase/server";
import { getActiveClientId, listClients } from "@/lib/workspace";

export default async function NewContactPage() {
  const supabase = await createClient();
  const clients = await listClients(supabase);
  const defaultClientId = await getActiveClientId();

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <HubBackButton href="/hub/contacts" label="Back to contacts" />
        <h1 className="mt-3 text-3xl font-semibold text-white">New contact</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Add a lead as a contact — set source, channel, and tags here. Pipeline
          metrics stay on Analytics.
        </p>
      </div>
      <ContactForm clients={clients} defaultClientId={defaultClientId} />
    </div>
  );
}
