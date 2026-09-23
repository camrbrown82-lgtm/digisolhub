import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveClientId } from "@/lib/workspace";

/**
 * Require an active workspace client and verify a row belongs to it.
 * Prevents cross-tenant IDOR when multiple customers use Hub.
 */
export async function requireWorkspaceClientId(supabase: SupabaseClient) {
  const clientId = await resolveClientId(supabase);
  if (!clientId) {
    return {
      clientId: "" as const,
      error: Response.json(
        { error: "No workspace selected. Choose a company under Working on." },
        { status: 400 },
      ),
    };
  }
  return { clientId, error: null as null };
}

export async function assertContactInWorkspace(
  supabase: SupabaseClient,
  contactId: string,
  clientId: string,
) {
  const { data } = await supabase
    .from("contacts")
    .select("id, client_id")
    .eq("id", contactId)
    .eq("client_id", clientId)
    .maybeSingle();
  return Boolean(data?.id);
}

export async function assertLeadInWorkspace(
  supabase: SupabaseClient,
  leadId: string,
  clientId: string,
) {
  const { data } = await supabase
    .from("leads")
    .select("id, client_id")
    .eq("id", leadId)
    .eq("client_id", clientId)
    .maybeSingle();
  return Boolean(data?.id);
}
