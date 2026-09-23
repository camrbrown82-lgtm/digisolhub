"use client";

import { useEffect } from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";
import {
  META_PIXEL_ID,
  META_TEST_EVENT_CODE,
  metaPixelConfigured,
} from "@/lib/metaPixel";
import { isHubPath, shouldSkipSiteAnalytics } from "@/lib/internalTraffic";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: (...args: unknown[]) => void;
  }
}

export function trackMetaEvent(
  event: string,
  params?: Record<string, string | number | boolean | undefined>,
  options?: { eventID?: string },
) {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return;
  try {
    if (/(?:^|;\s*)ds_internal=1(?:;|$)/.test(document.cookie)) return;
    if (window.location.pathname.indexOf("/hub") === 0) return;
  } catch {
    // ignore
  }
  if (options?.eventID) {
    window.fbq("track", event, params || {}, { eventID: options.eventID });
  } else {
    window.fbq("track", event, params || {});
  }
}

/**
 * Loads Meta Pixel on public pages only. Hub / internal traffic skipped.
 */
export function MetaPixel() {
  const pathname = usePathname();

  useEffect(() => {
    if (!metaPixelConfigured()) return;
    if (isHubPath(pathname) || shouldSkipSiteAnalytics(pathname)) return;
    if (typeof window.fbq !== "function") return;
    window.fbq("track", "PageView");
  }, [pathname]);

  if (!metaPixelConfigured()) return null;
  if (isHubPath(pathname) || shouldSkipSiteAnalytics(pathname)) return null;

  const initArgs = META_TEST_EVENT_CODE
    ? `fbq('init','${META_PIXEL_ID}');fbq('set','test_event_code','${META_TEST_EVENT_CODE}');`
    : `fbq('init','${META_PIXEL_ID}');`;

  return (
    <>
      <Script id="meta-pixel" strategy="afterInteractive">{`
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
${initArgs}
fbq('track','PageView');
`}</Script>
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  );
}
