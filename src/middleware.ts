import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/** Apex brand domain — never use www.wwwdigisol.com in marketing or SEO. */
export const CANONICAL_HOST = "wwwdigisol.com";

function hostOf(request: NextRequest) {
  const raw =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    "";
  return raw.split(":")[0]?.trim().toLowerCase() || "";
}

/** 308 any *.wwwdigisol.com host (e.g. www.wwwdigisol.com) to the apex. */
function canonicalHostRedirect(request: NextRequest) {
  const host = hostOf(request);
  if (!host || host === CANONICAL_HOST) return null;
  // Preview / Vercel deployment hosts stay as-is.
  if (host.endsWith(".vercel.app")) return null;
  if (!host.endsWith(CANONICAL_HOST)) return null;

  const url = request.nextUrl.clone();
  url.protocol = "https:";
  url.hostname = CANONICAL_HOST;
  url.port = "";
  return NextResponse.redirect(url, 308);
}

export async function middleware(request: NextRequest) {
  const hostRedirect = canonicalHostRedirect(request);
  if (hostRedirect) return hostRedirect;

  const path = request.nextUrl.pathname;
  const needsAuth =
    path === "/hub" ||
    path.startsWith("/hub/") ||
    path.startsWith("/auth/");
  if (!needsAuth) return NextResponse.next();

  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Run on all paths except static assets and Next internals.
     * Host redirects apply site-wide; session only for /hub and /auth.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp4|webm|pdf|txt|xml)$).*)",
  ],
};
