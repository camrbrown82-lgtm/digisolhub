import { NextResponse, type NextRequest } from "next/server";
import { isLikelyBot, locationSlugFromGeo } from "@/lib/geoRouting";
import { updateSession } from "@/lib/supabase/middleware";

/** Apex brand domain — never use www.wwwdigisol.com in marketing or SEO. */
export const CANONICAL_HOST = "wwwdigisol.com";

const GEO_COOKIE = "ds_geo_slug";
const GEO_LAND_COOKIE = "ds_geo_landed";

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

function readGeo(request: NextRequest) {
  const geo = (
    request as NextRequest & {
      geo?: { city?: string; country?: string; region?: string };
    }
  ).geo;
  return {
    city:
      geo?.city ||
      request.headers.get("x-vercel-ip-city") ||
      request.headers.get("cf-ipcity"),
    region:
      geo?.region ||
      request.headers.get("x-vercel-ip-country-region") ||
      request.headers.get("cf-region-code"),
    country:
      geo?.country ||
      request.headers.get("x-vercel-ip-country") ||
      request.headers.get("cf-ipcountry"),
  };
}

/**
 * Send Alberta visitors on `/` to their city lander so GA4 records
 * /locations/{city}. Skip bots so Google keeps indexing the apex homepage.
 */
function albertaHomeGeoRedirect(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path !== "/") return null;
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  if (request.nextUrl.searchParams.has("home")) return null;
  if (isLikelyBot(request.headers.get("user-agent"))) return null;

  const already = request.cookies.get(GEO_LAND_COOKIE)?.value;
  if (already === "1") return null;

  const fromCookie = request.cookies.get(GEO_COOKIE)?.value;
  const slug =
    fromCookie ||
    locationSlugFromGeo(readGeo(request)) ||
    null;
  if (!slug) return null;

  const dest = request.nextUrl.clone();
  dest.pathname = `/locations/${slug}`;
  dest.search = "";
  const response = NextResponse.redirect(dest, 307);
  response.cookies.set(GEO_COOKIE, slug, {
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    sameSite: "lax",
  });
  response.cookies.set(GEO_LAND_COOKIE, "1", {
    path: "/",
    maxAge: 60 * 60 * 6,
    sameSite: "lax",
  });
  return response;
}

export async function middleware(request: NextRequest) {
  const hostRedirect = canonicalHostRedirect(request);
  if (hostRedirect) return hostRedirect;

  const geoRedirect = albertaHomeGeoRedirect(request);
  if (geoRedirect) return geoRedirect;

  const path = request.nextUrl.pathname;
  const needsAuth =
    path === "/hub" ||
    path.startsWith("/hub/") ||
    path.startsWith("/auth/");
  if (!needsAuth) {
    // Remember geo for analytics even when not redirecting.
    const slug = locationSlugFromGeo(readGeo(request));
    if (slug && !request.cookies.get(GEO_COOKIE)?.value) {
      const response = NextResponse.next();
      response.cookies.set(GEO_COOKIE, slug, {
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
        sameSite: "lax",
      });
      return response;
    }
    return NextResponse.next();
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp4|webm|pdf|txt|xml)$).*)",
  ],
};
