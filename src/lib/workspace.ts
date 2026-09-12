import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";

export const HUB_CLIENT_COOKIE = "hub_client_id";

export async function getActiveClientId() {
  const store = await cookies();
  return store.get(HUB_CLIENT_COOKIE)?.value?.trim() || "";
}

export function applyClientFilter<T extends { eq: (col: string, val: string) => T }>(
  query: T,
  clientId: string,
) {
  return clientId ? query.eq("client_id", clientId) : query;
}

export async function listClients(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("clients")
    .select("id, name, domain, notes, created_at")
    .order("name");
  if (error) return [];
  return data ?? [];
}

export async function getActiveClient(supabase: SupabaseClient) {
  const id = await getActiveClientId();
  if (!id) return null;
  const { data } = await supabase
    .from("clients")
    .select("id, name, domain, site_key")
    .eq("id", id)
    .maybeSingle();
  return data;
}

export async function contactIdsForClient(
  supabase: SupabaseClient,
  clientId: string,
) {
  const { data } = await supabase.from("contacts").select("id").eq("client_id", clientId);
  return (data ?? []).map((row) => row.id as string);
}

export async function findOrCreateClient(
  supabase: SupabaseClient,
  input: { name?: string | null; domain?: string | null },
) {
  const name = input.name?.trim();
  const domain = input.domain?.trim().replace(/^https?:\/\//, "") || null;
  if (!name && !domain) return null;

  if (domain) {
    const { data: byDomain } = await supabase
      .from("clients")
      .select("id")
      .ilike("domain", domain)
      .maybeSingle();
    if (byDomain?.id) return byDomain.id;
  }

  if (name) {
    const { data: byName } = await supabase
      .from("clients")
      .select("id")
      .ilike("name", name)
      .maybeSingle();
    if (byName?.id) return byName.id;
  }

  const { data: created, error } = await supabase
    .from("clients")
    .insert({ name: name || domain, domain })
    .select("id")
    .single();
  if (error) return null;
  return created.id as string;
}
