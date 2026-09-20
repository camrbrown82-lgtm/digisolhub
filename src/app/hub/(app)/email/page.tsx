import { EmailComposer } from "@/components/hub/EmailComposer";
import { brandFromClient } from "@/lib/branding";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceClient } from "@/lib/workspace";

export default async function EmailPage({
  searchParams,
}: {
  searchParams: { template?: string };
}) {
  const supabase = await createClient();
  const active = await getWorkspaceClient(supabase);
  let campaignsQuery = supabase
    .from("campaigns")
    .select("id, name, status, sent_at")
    .order("created_at", { ascending: false })
    .limit(8);
  if (active) {
    campaignsQuery = campaignsQuery.eq("client_id", active.id);
  }
  const { data: campaigns } = await campaignsQuery;
  const { companyName, brand } = brandFromClient(active);

  return (
    <EmailComposer
      companyName={companyName}
      brand={brand}
      initialTemplateId={searchParams.template}
      campaigns={campaigns ?? []}
    />
  );
}
