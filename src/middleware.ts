import { NextResponse, type NextRequest } from "next/server";
import { isLikelyBot, locationSlugFromGeo } from "@/lib/geoRouting";
import {
  hubForbiddenResponse,
  isHubMachineAllowed,
  isHubProtectedPath,
  unlockHubGateIfRequested,
} from "@/lib/hubGate";
import { updateSession } from "@/lib/supabase/middleware";
import {
  GEO_AUDIENCE_COOKIE,
  GEO_CITY_COOKIE,
  GEO_COUNTRY_COOKIE,
  GEO_LAND_COOKIE,
  GEO_REGION_COOKIE,
  GEO_SLUG_COOKIE,
  buildVisitorRegion,
  type VisitorGeo,
} from "@/lib/visitorRegion";

/** Apex brand domain — never use www.wwwdigisol.com in marketing or SEO. */
export const CANONICAL_HOST = "wwwdigisol.com";

const COOKIE_BASE = {
  path: "/",
  sameSite: "lax" as const,
  maxAge: 60 * 60 * 24 * 30,
};

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
  if (host.endsWith(".vercel.app")) return null;
  if (!host.endsWith(CANONICAL_HOST)) return null;

  const url = request.nextUrl.clone();
  url.protocol = "https:";
  url.hostname = CANONICAL_HOST;
  url.port = "";
  return NextResponse.redirect(url, 308);
}

export function readRequestGeo(request: NextRequest): VisitorGeo {
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

function applyGeoCookies(response: NextResponse, geo: VisitorGeo) {
  const visitor = buildVisitorRegion(geo);
  if (visitor.countryCode) {
    response.cookies.set(GEO_COUNTRY_COOKIE, visitor.countryCode, COOKIE_BASE);
  }
  response.cookies.set(GEO_AUDIENCE_COOKIE, visitor.audience, COOKIE_BASE);
  if (visitor.city) {
    response.cookies.set(GEO_CITY_COOKIE, visitor.city, COOKIE_BASE);
  }
  if (visitor.region) {
    response.cookies.set(GEO_REGION_COOKIE, visitor.region, COOKIE_BASE);
  }
  return visitor;
}

function withGeoRequestHeaders(request: NextRequest, geo: VisitorGeo) {
  const visitor = buildVisitorRegion(geo);
  const requestHeaders = new Headers(request.headers);
  if (visitor.countryCode) {
    requestHeaders.set("x-digisol-country", visitor.countryCode);
  }
  if (visitor.region) {
    requestHeaders.set("x-digisol-region", visitor.region);
  }
  if (visitor.city) {
    requestHeaders.set("x-digisol-city", visitor.city);
  }
  requestHeaders.set("x-digisol-audience", visitor.audience);
  return { requestHeaders, visitor };
}

/**
 * Send Alberta visitors on `/` to their city lander so GA4 records
 * /locations/{city}. Skip bots so Google keeps indexing the apex homepage.
 */
function albertaHomeGeoRedirect(request: NextRequest, geo: VisitorGeo) {
  const path = request.nextUrl.pathname;
  if (path !== "/") return null;
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  if (request.nextUrl.searchParams.has("home")) return null;
  if (isLikelyBot(request.headers.get("user-agent"))) return null;

  const already = request.cookies.get(GEO_LAND_COOKIE)?.value;
  if (already === "1") return null;

  const fromCookie = request.cookies.get(GEO_SLUG_COOKIE)?.value;
  const slug = fromCookie || locationSlugFromGeo(geo) || null;
  if (!slug) return null;

  const dest = request.nextUrl.clone();
  dest.pathname = `/locations/${slug}`;
  dest.search = "";
  const response = NextResponse.redirect(dest, 307);
  applyGeoCookies(response, geo);
  response.cookies.set(GEO_SLUG_COOKIE, slug, COOKIE_BASE);
  response.cookies.set(GEO_LAND_COOKIE, "1", {
    ...COOKIE_BASE,
    maxAge: 60 * 60 * 6,
  });
  return response;
}

function nextWithGeo(request: NextRequest, geo: VisitorGeo) {
  const { requestHeaders, visitor } = withGeoRequestHeaders(request, geo);
  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  applyGeoCookies(response, geo);

  const slug = locationSlugFromGeo(geo);
  if (slug && !request.cookies.get(GEO_SLUG_COOKIE)?.value) {
    response.cookies.set(GEO_SLUG_COOKIE, slug, COOKIE_BASE);
  }

  response.headers.set(
    "Vary",
    "X-Vercel-IP-Country, X-Vercel-IP-Country-Region, Cookie",
  );
  response.headers.set("x-digisol-audience", visitor.audience);
  return response;
}

export async function middleware(request: NextRequest) {
  const hostRedirect = canonicalHostRedirect(request);
  if (hostRedirect) return hostRedirect;

  const path = request.nextUrl.pathname;

  // Hub / admin: machine gate first — strangers never see a login prompt.
  if (isHubProtectedPath(path)) {
    const unlock = unlockHubGateIfRequested(request);
    if (unlock) return unlock;

    if (!isHubMachineAllowed(request)) {
      return hubForbiddenResponse();
    }

    const geo = readRequestGeo(request);
    const sessionResponse = await updateSession(request);
    applyGeoCookies(sessionResponse, geo);
    return sessionResponse;
  }

  const geo = readRequestGeo(request);
  const geoRedirect = albertaHomeGeoRedirect(request, geo);
  if (geoRedirect) return geoRedirect;

  return nextWithGeo(request, geo);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp4|webm|pdf|txt|xml)$).*)",
  ],
};
