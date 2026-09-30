import { redirect } from "next/navigation";
import { HubShell } from "@/components/hub/HubShell";
import { HubSidebar } from "@/components/hub/HubSidebar";
import { isAllowedEmail } from "@/lib/allowlist";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";
import {
  companySiteUrl,
  ensureDigisolClient,
  getWorkspaceClient,
  isDigisolClient,
  listClients,
} from "@/lib/workspace";

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

  await ensureDigisolClient(supabase);
  const clients = await listClients(supabase);
  const workspace = await getWorkspaceClient(supabase);
  const house = isDigisolClient(workspace);

  return (
    <HubShell
      clients={clients}
      activeClientId={workspace?.id || ""}
      sidebar={
        <HubSidebar
          companyName={workspace?.name || ""}
          siteUrl={house ? "/" : companySiteUrl(workspace)}
        />
      }
    >
      {children}
    </HubShell>
  );
}
