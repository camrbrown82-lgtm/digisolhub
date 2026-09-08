export function allowedEmail() {
  return (
    process.env.HUB_ALLOWED_EMAIL ?? "cam.r.brown82@gmail.com"
  ).trim().toLowerCase();
}

export function isAllowedEmail(email?: string | null) {
  return (email ?? "").trim().toLowerCase() === allowedEmail();
}

export function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );
}
