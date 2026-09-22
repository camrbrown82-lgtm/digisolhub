/** Cookie set while using DigiSol Hub so self-traffic is excluded from analytics. */
export const INTERNAL_TRAFFIC_COOKIE = "ds_internal";
export const INTERNAL_TRAFFIC_MAX_AGE = 60 * 60 * 24 * 14; // 14 days

export function isHubPath(pathname: string | null | undefined) {
  if (!pathname) return false;
  return pathname === "/hub" || pathname.startsWith("/hub/");
}

export function readInternalTrafficCookie() {
  if (typeof document === "undefined") return false;
  return new RegExp(`(?:^|;\\s*)${INTERNAL_TRAFFIC_COOKIE}=1(?:;|$)`).test(
    document.cookie,
  );
}

export function markInternalTraffic() {
  if (typeof document === "undefined") return;
  document.cookie = `${INTERNAL_TRAFFIC_COOKIE}=1; path=/; max-age=${INTERNAL_TRAFFIC_MAX_AGE}; SameSite=Lax`;
}

/** Allow honest measurement again (incognito also works). */
export function clearInternalTraffic() {
  if (typeof document === "undefined") return;
  document.cookie = `${INTERNAL_TRAFFIC_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}

export function shouldSkipSiteAnalytics(pathname?: string | null) {
  if (isHubPath(pathname)) return true;
  if (typeof window !== "undefined") {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("notrack") === "1") {
        markInternalTraffic();
        return true;
      }
      if (params.get("track") === "1") {
        clearInternalTraffic();
        return false;
      }
    } catch {
      // ignore
    }
  }
  return readInternalTrafficCookie();
}
