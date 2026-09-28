"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { trackEvent } from "@/lib/analytics";
import { shouldSkipSiteAnalytics } from "@/lib/internalTraffic";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

function digisolSiteKey() {
  if (typeof document === "undefined") return "";
  const node =
    document.querySelector<HTMLScriptElement>('script[src*="/t.js"]') ||
    document.querySelector<HTMLScriptElement>("script[data-key]");
  if (!node) return "";
  const attr = node.getAttribute("data-key");
  if (attr) return attr;
  try {
    return new URL(node.src, window.location.origin).searchParams.get("k") || "";
  } catch {
    return "";
  }
}

function locationContentGroup(pathname: string) {
  const match = pathname.match(/^\/locations\/([^/?#]+)/);
  return match?.[1] || undefined;
}

/**
 * Sends first-party pageviews and the GA4 city-lander event on App Router
 * navigations. Skips Hub and internal-traffic browsers.
 */
export function GaRouteTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastSent = useRef("");

  useEffect(() => {
    if (!pathname || shouldSkipSiteAnalytics(pathname)) return;

    const search = searchParams?.toString();
    const path = `${pathname}${search ? `?${search}` : ""}`;
    if (lastSent.current === path) return;
    lastSent.current = path;

    const title = document.title;
    const city = locationContentGroup(pathname);

    // No page_view here: GA4 enhanced measurement sends it on load and on history changes.
    if (city && typeof window.gtag === "function") {
      trackEvent("location_page_view", {
        city,
        page_path: path,
      });
    }

    const key = digisolSiteKey();
    if (!key) return;
    let visitor: string | null = null;
    try {
      visitor = localStorage.getItem(`ds_vid_${key}`);
    } catch {
      // ignore
    }
    if (!visitor) {
      visitor =
        (crypto.randomUUID && crypto.randomUUID()) || String(Date.now());
      try {
        localStorage.setItem(`ds_vid_${key}`, visitor);
      } catch {
        // ignore
      }
    }

    void fetch("/api/collect", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        k: key,
        path,
        host: window.location.host,
        title,
        referrer: document.referrer,
        locale: navigator.language,
        vid: visitor,
      }),
      keepalive: true,
      mode: "cors",
    }).catch(() => null);
  }, [pathname, searchParams]);

  return null;
}
