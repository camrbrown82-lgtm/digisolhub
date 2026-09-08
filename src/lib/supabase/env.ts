function firstEnv(...names: string[]) {
  for (const name of names) {
    const value = process.env[name]?.trim().replace(/^["']|["']$/g, "");
    if (value) return value;
  }
  return "";
}

function normalizeSupabaseUrl(raw?: string | null) {
  if (!raw) return "";
  return raw
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/^https:\/\/https:\/\//i, "https://")
    .replace(/\/$/, "");
}

function looksLikeJwt(value: string) {
  return value.startsWith("eyJ") && value.split(".").length === 3;
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
  const named = firstEnv(
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_SECRET_KEY",
    "SUPABASE_SERVICE_KEY",
  );
  if (named) return named;

  for (const name of [
    "SUPABASE_SECRET",
    "SUPABASE_SERVICE_ROLE_SECRET",
    "SUPABASE_JWT_SECRET",
  ]) {
    const value = firstEnv(name);
    if (value && looksLikeJwt(value)) return value;
  }
  return "";
}

export function supabaseEnvStatus() {
  return {
    url: Boolean(getSupabaseUrl()),
    anon: Boolean(getSupabaseAnonKey()),
    serviceRole: Boolean(getSupabaseServiceRoleKey()),
  };
}
