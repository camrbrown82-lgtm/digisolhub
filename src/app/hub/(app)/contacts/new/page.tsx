import { ContactForm } from "@/components/hub/ContactForm";
import { createClient } from "@/lib/supabase/server";
import { getActiveClientId, listClients } from "@/lib/workspace";

export default async function NewContactPage() {
  const supabase = await createClient();
  const clients = await listClients(supabase);
  const defaultClientId = await getActiveClientId();

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-3xl font-semibold text-white">New contact</h1>
      <ContactForm clients={clients} defaultClientId={defaultClientId} />
    </div>
  );
}
