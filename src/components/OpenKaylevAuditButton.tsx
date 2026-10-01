"use client";

import type { ReactNode } from "react";
import { openKaylevAudit } from "@/components/ContactOptions";
import { trackEvent } from "@/lib/analytics";

/** Opens Kaylev on the free website audit. Works on the homepage and city landers ads already use. */
export function OpenKaylevAuditButton({
  children,
  className,
  location,
}: {
  children: ReactNode;
  className?: string;
  location: string;
}) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        trackEvent("cta_click", { cta_name: "free_website_audit", location });
        openKaylevAudit();
      }}
    >
      {children}
    </button>
  );
}
