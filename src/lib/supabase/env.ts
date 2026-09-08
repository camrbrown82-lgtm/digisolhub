function normalizeSupabaseUrl(raw?: string | null) {
  if (!raw) return "";
  return raw
    .trim()
    .replace(/^https:\/\/https:\/\//i, "https://")
    .replace(/\/$/, "");
}

export function getSupabaseUrl() {
  return normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
}

export function getSupabaseAnonKey() {
  return (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
}
