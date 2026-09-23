"use client";

import { usePathname } from "next/navigation";
import { VisitorChat } from "@/components/VisitorChat";

/**
 * Site-wide Caleb widget for public marketing pages.
 * Hidden on DigiSol Hub (/hub) so operators keep a clean admin UI.
 */
export function PublicKaylevChat() {
  const pathname = usePathname() || "";
  if (pathname.startsWith("/hub")) return null;
  return <VisitorChat />;
}
