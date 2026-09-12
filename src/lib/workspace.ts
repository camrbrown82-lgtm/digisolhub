import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DIGISOL_BRAND,
  DIGISOL_HOUSE_DOMAIN,
  DIGISOL_HOUSE_NAME,
  isBrandEmpty,
} from "@/lib/branding";

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

export async function ensureDigisolClient(supabase: SupabaseClient) {
  const { data: existing } = await supabase
    .from("clients")
    .select("id, branding")
    .ilike("name", DIGISOL_HOUSE_NAME)
    .maybeSingle();

  if (existing?.id) {
    if (isBrandEmpty(existing.branding)) {
      await supabase
        .from("clients")
        .update({
          domain: DIGISOL_HOUSE_DOMAIN,
          branding: DIGISOL_BRAND,
          notes: "House brand for DigiSol.",
        })
        .eq("id", existing.id);
    }
    return existing.id as string;
  }

  const { data: created, error } = await supabase
    .from("clients")
    .insert({
      name: DIGISOL_HOUSE_NAME,
      domain: DIGISOL_HOUSE_DOMAIN,
      notes: "House brand for DigiSol.",
      branding: DIGISOL_BRAND,
    })
    .select("id")
    .single();
  if (error || !created) return "";
  return created.id as string;
}

export async function getDigisolClient(supabase: SupabaseClient) {
  const id = await ensureDigisolClient(supabase);
  if (!id) return null;
  const { data } = await supabase
    .from("clients")
    .select("id, name, domain, site_key, notes, branding")
    .eq("id", id)
    .maybeSingle();
  return data;
}

export async function listClients(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("clients")
    .select("id, name, domain, notes, branding, created_at")
    .order("name");
  if (error) return [];
  return data ?? [];
}

export async function getActiveClient(supabase: SupabaseClient) {
  const id = await getActiveClientId();
  if (!id) return null;
  const { data } = await supabase
    .from("clients")
    .select("id, name, domain, site_key, notes, branding")
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
