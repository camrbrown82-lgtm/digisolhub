import { ClientForm } from "@/components/hub/ClientForm";
import { OpenClientButton } from "@/components/hub/OpenClientButton";
import { createClient } from "@/lib/supabase/server";
import { listClients } from "@/lib/workspace";

export default async function ClientsPage() {
  const supabase = await createClient();
  const clients = await listClients(supabase);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-white">Companies</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Each company is its own workspace. Open work or Files to keep contacts
          and customer files separate.
        </p>
      </div>
      <ul className="divide-y divide-zinc-800 rounded-2xl border border-zinc-800">
        {clients.length === 0 ? (
          <li className="px-4 py-8 text-sm text-zinc-500">
            No companies yet. Create one below.
          </li>
        ) : (
          clients.map((client) => (
            <li key={client.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-white">{client.name}</p>
                <p className="text-xs text-zinc-500">{client.domain || "No domain"}</p>
              </div>
              <div className="flex gap-4">
                <OpenClientButton clientId={client.id} />
                <OpenClientButton clientId={client.id} href="/hub/assets" label="Files" />
              </div>
            </li>
          ))
        )}
      </ul>
      <section>
        <h2 className="mb-4 text-lg font-semibold text-white">Add a company</h2>
        <ClientForm />
      </section>
    </div>
  );
}
