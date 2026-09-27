import type { NextRequest, NextResponse } from "next/server";

/**
 * Session-only cookie proving the Hub password was entered this visit.
 * Holds the last-activity time (ms). Dropped when the browser closes, when a
 * public page is opened, or after HUB_PASS_IDLE_MS without Hub activity.
 */
export const HUB_PASS_COOKIE = "ds_hub_pass";

export const HUB_PASS_IDLE_MS = 30 * 60 * 1000;

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export function hasFreshHubPass(request: NextRequest, now = Date.now()) {
  const raw = request.cookies.get(HUB_PASS_COOKIE)?.value;
  const last = raw ? Number(raw) : NaN;
  if (!Number.isFinite(last)) return false;
  return last <= now + 60_000 && now - last < HUB_PASS_IDLE_MS;
}

export function setHubPass(response: NextResponse, now = Date.now()) {
  response.cookies.set(HUB_PASS_COOKIE, String(now), COOKIE_OPTIONS);
}

export function clearHubPass(response: NextResponse) {
  response.cookies.set(HUB_PASS_COOKIE, "", { ...COOKIE_OPTIONS, maxAge: 0 });
}

/** A real page visit (not prefetch, asset, API, or iframe). */
export function isPageNavigation(request: NextRequest) {
  if (request.method !== "GET") return false;
  const h = request.headers;
  const prefetch =
    h.get("next-router-prefetch") ||
    h.get("purpose") === "prefetch" ||
    (h.get("sec-purpose") ?? "").includes("prefetch");
  if (prefetch) return false;
  return h.get("sec-fetch-dest") === "document" || h.get("rsc") === "1";
}

/** Opened from a Hub page (e.g. previewing a public page from the Hub). */
export function cameFromHub(request: NextRequest) {
  const referer = request.headers.get("referer");
  if (!referer) return false;
  try {
    const url = new URL(referer);
    return (
      url.host === request.nextUrl.host &&
      (url.pathname === "/hub" || url.pathname.startsWith("/hub/"))
    );
  } catch {
    return false;
  }
}
