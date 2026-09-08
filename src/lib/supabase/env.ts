function firstEnv(...names: string[]) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return "";
}

function normalizeSupabaseUrl(raw?: string | null) {
  if (!raw) return "";
  return raw
    .trim()
    .replace(/^https:\/\/https:\/\//i, "https://")
    .replace(/\/$/, "");
}

export function getSupabaseUrl() {
  return normalizeSupabaseUrl(
    firstEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL"),
  );
}

export function getSupabaseAnonKey() {
  return firstEnv(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_ANON_KEY",
  );
}

export function getSupabaseServiceRoleKey() {
  return firstEnv("SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEY");
}
