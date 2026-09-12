import { EmailComposer } from "@/components/hub/EmailComposer";
import { createClient } from "@/lib/supabase/server";
import { getActiveClient } from "@/lib/workspace";

export default async function EmailPage({
  searchParams,
}: {
  searchParams: { template?: string };
}) {
  const supabase = await createClient();
  const active = await getActiveClient(supabase);
  let campaignsQuery = supabase
    .from("campaigns")
    .select("id, name, status, sent_at")
    .order("created_at", { ascending: false })
    .limit(8);
  if (active) {
    campaignsQuery = campaignsQuery.eq("client_id", active.id);
  }
  const { data: campaigns } = await campaignsQuery;

  return (
    <EmailComposer
      companyName={active?.name || "DigiSol"}
      initialTemplateId={searchParams.template}
      campaigns={campaigns ?? []}
    />
  );
}
