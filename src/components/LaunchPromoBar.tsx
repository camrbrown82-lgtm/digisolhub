"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMessages } from "@/lib/i18n/client";
import { LAUNCH_PROMO, launchPromoStatus } from "@/lib/pricing";

/** Site-wide launch offer. Hidden in Hub. Pricing already explains the code in full. */
export function LaunchPromoBar() {
  const pathname = usePathname() || "";
  const { pricingBuilder: t } = useMessages();
  const status = launchPromoStatus();
  if (pathname.startsWith("/hub") || status === "ended") return null;

  return (
    <Link
      href="/pricing"
      className="block bg-emerald-500 px-4 py-2 text-center text-sm font-semibold text-zinc-950 hover:bg-emerald-400"
    >
      {t.launchOffer(LAUNCH_PROMO.code)}
      {" · "}
      {t.launchBody(LAUNCH_PROMO.buildPercent, LAUNCH_PROMO.otherPercent)}{" "}
      <span className="font-medium">{status === "upcoming" ? t.launchStarts : t.launchWindow}</span>
    </Link>
  );
}
