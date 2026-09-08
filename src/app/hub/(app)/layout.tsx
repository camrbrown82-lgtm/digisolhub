import { redirect } from "next/navigation";
import { HubShell } from "@/components/hub/HubShell";
import { HubSidebar } from "@/components/hub/HubSidebar";
import { isAllowedEmail } from "@/lib/allowlist";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";
import { getActiveClientId, listClients } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export default async function HubAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!getSupabaseUrl() || !getSupabaseAnonKey()) {
    redirect("/hub/login");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAllowedEmail(user.email)) {
    redirect("/hub/login");
  }

  const clients = await listClients(supabase);
  const activeClientId = await getActiveClientId();

  return (
    <HubShell
      clients={clients}
      activeClientId={activeClientId}
      sidebar={<HubSidebar clients={clients} activeClientId={activeClientId} />}
    >
      {children}
    </HubShell>
  );
}
