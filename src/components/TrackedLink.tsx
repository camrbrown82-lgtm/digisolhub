"use client";

import type { AnchorHTMLAttributes, ReactNode } from "react";
import { trackEvent } from "@/lib/analytics";

type TrackedLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  eventName: string;
  eventParams?: Record<string, string>;
  children: ReactNode;
};

export function TrackedLink({
  eventName,
  eventParams,
  onClick,
  children,
  ...props
}: TrackedLinkProps) {
  return (
    <a
      {...props}
      onClick={(event) => {
        trackEvent(eventName, eventParams);
        onClick?.(event);
      }}
    >
      {children}
    </a>
  );
}
