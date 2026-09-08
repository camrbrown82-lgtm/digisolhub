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
    firstEnv("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL"),
  );
}

export function getSupabaseAnonKey() {
  return firstEnv(
    "SUPABASE_ANON_KEY",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
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
  ]) {
    const value = firstEnv(name);
    if (value && looksLikeJwt(value)) return value;
  }
  return "";
}

export function getSiteUrl() {
  const explicit = firstEnv("SITE_URL", "NEXT_PUBLIC_SITE_URL");
  if (explicit) return explicit.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export function getWeb3FormsAccessKey() {
  return firstEnv("WEB3FORMS_ACCESS_KEY", "NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY");
}

export function supabaseEnvStatus() {
  return {
    url: Boolean(getSupabaseUrl()),
    anon: Boolean(getSupabaseAnonKey()),
    serviceRole: Boolean(getSupabaseServiceRoleKey()),
  };
}
