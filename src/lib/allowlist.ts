import { DIGISOL_EMAIL } from "@/lib/site";

/** Public inbox. Also allowed in the Hub, once that Supabase user exists. */
const OWNER_EMAIL = DIGISOL_EMAIL;
/** Gmail login kept so the existing Hub password still works. */
const LEGACY_OWNER_EMAIL = "cam.r.brown82@gmail.com";
/** Inbox the Hub sign-in form used before the public address moved to cam@. */
const PREVIOUS_HUB_EMAIL = "digisol2026@yahoo.com";

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

  const set = new Set<string>([
    OWNER_EMAIL,
    LEGACY_OWNER_EMAIL,
    PREVIOUS_HUB_EMAIL,
    ...fromEnv,
  ]);
  return Array.from(set);
}

export function allowedEmail() {
  return OWNER_EMAIL;
}

/** Try the existing logins before the new public inbox. */
export function hubLoginEmails() {
  const seen = new Set<string>();
  const emails: string[] = [];
  for (const email of [LEGACY_OWNER_EMAIL, PREVIOUS_HUB_EMAIL, OWNER_EMAIL]) {
    const value = email.trim().toLowerCase();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    emails.push(value);
  }
  return emails;
}

export function isAllowedEmail(email?: string | null) {
  const value = (email ?? "").trim().toLowerCase();
  return value.length > 0 && allowedEmails().includes(value);
}

export { getSiteUrl as siteUrl } from "@/lib/supabase/env";
