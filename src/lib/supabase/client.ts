"use client";

import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";
import { createBrowserClient } from "@supabase/ssr";

export function createBrowserSupabase() {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  if (!url || !key) {
    throw new Error(
      "Supabase browser keys are missing on this deploy. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY on Vercel, then Redeploy.",
    );
  }
  return createBrowserClient(url, key);
}
