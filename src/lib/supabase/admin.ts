import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseUrl } from "@/lib/supabase/env";

export function createAdminClient(): SupabaseClient {
  const url = getSupabaseUrl();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function hasAdminClient() {
  return Boolean(getSupabaseUrl() && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
