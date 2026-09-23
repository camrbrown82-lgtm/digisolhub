import { NextResponse, type NextRequest } from "next/server";

/** HttpOnly cookie proving this browser was unlocked with HUB_GATE_SECRET. */
export const HUB_GATE_COOKIE = "ds_hub_gate";

const GATE_COOKIE_MAX_AGE = 60 * 60 * 24 * 90; // 90 days on this computer

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i += 1) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}

export function hubGateSecret() {
  return (process.env.HUB_GATE_SECRET ?? "").trim();
}

export function hubAllowedIps() {
  return (process.env.HUB_ALLOWED_IPS ?? "")
    .split(/[,;\s]+/)
    .map((ip) => ip.trim())
    .filter((ip) => ip.length > 0 && ip !== "*" && !ip.includes("/"));
}

export function isHubProtectedPath(pathname: string) {
  return (
    pathname === "/hub" ||
    pathname.startsWith("/hub/") ||
    pathname.startsWith("/api/hub/") ||
    pathname === "/api/auth/ensure-hub-user" ||
    pathname.startsWith("/auth/")
  );
}

export function clientIp(request: NextRequest) {
  const forwarded =
    request.headers.get("x-vercel-forwarded-for") ||
    request.headers.get("x-forwarded-for") ||
    "";
  const first = forwarded.split(",")[0]?.trim();
  return (
    first ||
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("cf-connecting-ip")?.trim() ||
    ""
  );
}

function isLocalDevHost(request: NextRequest) {
  const host = (
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    ""
  )
    .split(":")[0]
    ?.trim()
    .toLowerCase();
  return host === "localhost" || host === "127.0.0.1";
}

export function isHubMachineAllowed(request: NextRequest) {
  // Local Next.js only — never treat Vercel preview/prod as local.
  if (process.env.NODE_ENV === "development" && isLocalDevHost(request)) {
    return true;
  }

  const ip = clientIp(request);
  if (ip && hubAllowedIps().includes(ip)) return true;

  const secret = hubGateSecret();
  if (!secret) return false;

  const cookie = request.cookies.get(HUB_GATE_COOKIE)?.value ?? "";
  return timingSafeEqual(cookie, secret);
}

/**
 * Unlock this browser with ?gate=HUB_GATE_SECRET (bookmark once on your PC).
 * Returns a redirect response when unlock succeeds; otherwise null.
 */
export function unlockHubGateIfRequested(request: NextRequest) {
  const secret = hubGateSecret();
  if (!secret) return null;

  const offered = request.nextUrl.searchParams.get("gate");
  if (!offered || !timingSafeEqual(offered, secret)) return null;

  const dest = request.nextUrl.clone();
  dest.searchParams.delete("gate");
  if (!dest.pathname.startsWith("/hub")) {
    dest.pathname = "/hub/login";
  }

  const response = NextResponse.redirect(dest, 303);
  response.cookies.set(HUB_GATE_COOKIE, secret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: GATE_COOKIE_MAX_AGE,
  });
  return response;
}

/** Strangers never see a Hub login — soft 404. */
export function hubForbiddenResponse() {
  return new NextResponse("Not Found", {
    status: 404,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
