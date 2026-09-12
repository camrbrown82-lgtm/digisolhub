import type { SupabaseClient } from "@supabase/supabase-js";
import { siteUrl } from "@/lib/allowlist";

export const EMAIL_LOGO_NOTE = "email-logo";

export type EmailLogoAsset = {
  id: string;
  public_url: string | null;
  path: string;
  bucket: string;
};

export function defaultEmailLogoUrl() {
  return `${siteUrl()}/logo.jpg`;
}

export async function getEmailLogoAsset(
  supabase: SupabaseClient,
  clientId?: string | null,
) {
  let query = supabase
    .from("assets")
    .select("id, public_url, path, bucket")
    .eq("notes", EMAIL_LOGO_NOTE)
    .order("created_at", { ascending: false })
    .limit(1);
  query = clientId ? query.eq("client_id", clientId) : query.is("client_id", null);

  const { data, error } = await query;
  if (error) return null;
  return (data?.[0] as EmailLogoAsset | undefined) ?? null;
}

export async function getEmailLogoUrl(
  supabase: SupabaseClient,
  clientId?: string | null,
) {
  const asset = await getEmailLogoAsset(supabase, clientId);
  return asset?.public_url || defaultEmailLogoUrl();
}
