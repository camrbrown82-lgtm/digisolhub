import { redirect } from "next/navigation";
import { HubSidebar } from "@/components/hub/HubSidebar";
import { isAllowedEmail } from "@/lib/allowlist";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";

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

  return (
    <div className="flex min-h-screen bg-zinc-950">
      <HubSidebar />
      <div className="min-w-0 flex-1 overflow-y-auto p-6 lg:p-10">{children}</div>
    </div>
  );
}
