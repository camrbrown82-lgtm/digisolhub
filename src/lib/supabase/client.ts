"use client";

import { createBrowserClient, type SupabaseClient } from "@supabase/ssr";

let browserClient: SupabaseClient | null = null;
let loading: Promise<SupabaseClient> | null = null;

export async function createBrowserSupabase() {
  if (browserClient) return browserClient;
  if (loading) return loading;

  loading = (async () => {
    const response = await fetch("/api/public/config");
    const config = (await response.json()) as {
      supabaseUrl?: string;
      supabaseAnonKey?: string;
      error?: string;
    };
    if (!response.ok || !config.supabaseUrl || !config.supabaseAnonKey) {
      throw new Error(
        config.error ||
          "Supabase is not connected on the server. Set SUPABASE_URL and SUPABASE_ANON_KEY, then redeploy.",
      );
    }
    browserClient = createBrowserClient(config.supabaseUrl, config.supabaseAnonKey);
    return browserClient;
  })();

  try {
    return await loading;
  } finally {
    loading = null;
  }
}
