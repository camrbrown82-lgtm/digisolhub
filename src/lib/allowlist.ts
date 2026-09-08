const DEFAULT_ALLOWED = ["cam.r.brown82@gmail.com"];

function allowedEmails() {
  const fromEnv = (process.env.HUB_ALLOWED_EMAIL ?? "")
    .split(/[,;\s]+/)
    .map((email) => email.trim().toLowerCase().replace(/^["']|["']$/g, ""))
    .filter(Boolean);

  return fromEnv.length > 0 ? fromEnv : DEFAULT_ALLOWED;
}

export function allowedEmail() {
  return allowedEmails()[0];
}

export function isAllowedEmail(email?: string | null) {
  const value = (email ?? "").trim().toLowerCase();
  return value.length > 0 && allowedEmails().includes(value);
}

export { getSiteUrl as siteUrl } from "@/lib/supabase/env";
