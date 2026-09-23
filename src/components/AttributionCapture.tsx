"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { captureAttributionFromLocation } from "@/lib/attributionClient";

/**
 * Captures first-touch UTM / fbclid on public pages for later lead attribution.
 */
export function AttributionCapture() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname?.startsWith("/hub")) return;
    captureAttributionFromLocation(window.location.href);
  }, [pathname, searchParams]);

  return null;
}
