"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

/**
 * Hub navigation back control.
 * Prefer an explicit parent href; otherwise use browser history with a Hub fallback.
 */
export function HubBackButton({
  href,
  label = "Back",
  className = "",
}: {
  href?: string;
  label?: string;
  className?: string;
}) {
  const router = useRouter();
  const fallback = href || "/hub/analytics";

  function onClick() {
    if (href) {
      router.push(href);
      return;
    }
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(fallback);
  }

  if (href) {
    return (
      <Link
        href={href}
        className={`inline-flex items-center gap-1.5 text-sm text-zinc-400 transition hover:text-white ${className}`}
      >
        <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
        {label}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 text-sm text-zinc-400 transition hover:text-white ${className}`}
    >
      <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
      {label}
    </button>
  );
}
