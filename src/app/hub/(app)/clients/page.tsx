import { ClientContactButton } from "@/components/hub/ClientContactButton";
import { ClientForm } from "@/components/hub/ClientForm";
import { DIGISOL_HOUSE_NAME } from "@/lib/branding";
import { OpenClientButton } from "@/components/hub/OpenClientButton";
import { createClient } from "@/lib/supabase/server";
import { listClients } from "@/lib/workspace";

export default async function ClientsPage() {
  const supabase = await createClient();
  const clients = await listClients(supabase);
  const houseId = clients.find((c) => c.name.trim().toLowerCase() === DIGISOL_HOUSE_NAME.toLowerCase())?.id;
  const { data: wins } = houseId
    ? await supabase.from("leads").select("company, email").eq("client_id", houseId).eq("stage", "won")
    : { data: [] };
  const signupEmail = new Map(
    (wins ?? []).map((lead) => [String(lead.company || "").trim().toLowerCase(), (lead.email as string | null) || ""]),
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-white">Companies</h1>
        <p className="mt-1 max-w-2xl text-sm text-zinc-400">
          Each company is its own brand workspace. Creating one starts a kit
          (background, text, highlights, voice, logo). Switch Working on, then
          fill Brand so posters and email stay on that company — DigiSol house
          look never carries over.
        </p>
      </div>
      <ul className="divide-y divide-zinc-800 rounded-2xl border border-zinc-800">
        {clients.length === 0 ? (
          <li className="px-4 py-8 text-sm text-zinc-500">
            No companies yet. Create one below.
          </li>
        ) : (
          clients.map((client) => (
            <li key={client.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="text-white">{client.name}</p>
                <p className="text-xs text-zinc-500">{client.domain || "No domain"}</p>
                {client.id === houseId ? null : signupEmail.get(client.name.trim().toLowerCase()) ? (
                  <p className="text-xs text-emerald-300/80">
                    Client · {signupEmail.get(client.name.trim().toLowerCase())}
                  </p>
                ) : (
                  <ClientContactButton clientId={client.id} />
                )}
              </div>
              <div className="flex gap-4">
                <OpenClientButton clientId={client.id} />
                <OpenClientButton clientId={client.id} href="/hub/brand" label="Brand" />
                <OpenClientButton clientId={client.id} href="/hub/assets" label="Files" />
                <OpenClientButton clientId={client.id} href="/hub/analytics" label="Analytics" />
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
