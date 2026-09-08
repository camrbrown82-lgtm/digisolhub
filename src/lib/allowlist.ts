export function allowedEmail() {
  return (
    process.env.HUB_ALLOWED_EMAIL ?? "cam.r.brown82@gmail.com"
  ).trim().toLowerCase();
}

export function isAllowedEmail(email?: string | null) {
  return (email ?? "").trim().toLowerCase() === allowedEmail();
}

export { getSiteUrl as siteUrl } from "@/lib/supabase/env";
