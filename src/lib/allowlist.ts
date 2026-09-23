const OWNER_EMAIL = "cam.r.brown82@gmail.com";

/**
 * DigiSol Hub is owner-only.
 * HUB_ALLOWED_EMAIL may list additional exact emails (comma-separated).
 * Wildcards / empty tokens are ignored. Never open to the public.
 */
function allowedEmails() {
  const fromEnv = (process.env.HUB_ALLOWED_EMAIL ?? "")
    .split(/[,;\s]+/)
    .map((email) => email.trim().toLowerCase().replace(/^["']|["']$/g, ""))
    .filter(
      (email) =>
        email.length > 0 &&
        email.includes("@") &&
        !email.includes("*") &&
        email !== "anyone" &&
        email !== "all",
    );

  const set = new Set<string>([OWNER_EMAIL, ...fromEnv]);
  return Array.from(set);
}

export function allowedEmail() {
  return OWNER_EMAIL;
}

export function isAllowedEmail(email?: string | null) {
  const value = (email ?? "").trim().toLowerCase();
  return value.length > 0 && allowedEmails().includes(value);
}

export { getSiteUrl as siteUrl } from "@/lib/supabase/env";
