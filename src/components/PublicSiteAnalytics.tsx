"use client";

import { type ReactNode, useEffect, useState } from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { GaRouteTrackerBoundary } from "@/components/GaRouteTrackerBoundary";
import { GOOGLE_ADS_ID } from "@/lib/ads";
import {
  isHubPath,
  markInternalTraffic,
  shouldSkipSiteAnalytics,
} from "@/lib/internalTraffic";

/**
 * Public-site analytics only.
 * Hub visits never load GA4 / first-party beacons, and mark this browser
 * as internal so tinkering on the live site does not inflate metrics.
 */
export function PublicSiteAnalytics({ children }: { children?: ReactNode }) {
  const pathname = usePathname();
  const [skip, setSkip] = useState(true);

  useEffect(() => {
    if (isHubPath(pathname)) {
      markInternalTraffic();
      setSkip(true);
      return;
    }
    setSkip(shouldSkipSiteAnalytics(pathname));
  }, [pathname]);

  if (isHubPath(pathname) || skip) {
    return null;
  }

  return (
    <>
      <Script
        src="https://www.googletagmanager.com/gtag/js?id=G-4ZBG4VPC9C"
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-4ZBG4VPC9C', { send_page_view: true });
          gtag('config', 'G-DCKSJLNE4T', { send_page_view: true });
          ${GOOGLE_ADS_ID ? `gtag('config', '${GOOGLE_ADS_ID}');` : ""}
        `}
      </Script>
      <GaRouteTrackerBoundary />
      {children}
    </>
  );
}
