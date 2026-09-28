import Link from "next/link";
import { Globe } from "lucide-react";
import { DEFAULT_LOCALE, localizePath } from "@/lib/i18n/config";
import { getLocale } from "@/lib/i18n/server";
import { getMessages } from "@/lib/i18n/messages";
import type { VisitorRegion } from "@/lib/visitorRegion";

/**
 * Lightweight banner for US / global visitors — signals DigiSol serves
 * beyond Alberta without changing the overall layout chrome.
 */
export function InternationalHomeBanner({ region }: { region: VisitorRegion }) {
  if (!region.isInternational) return null;
  const locale = getLocale();
  const t = getMessages(locale).intlBanner;

  // Country names are English, so other languages fall back to "outside Canada".
  const where =
    region.countryCode === "US"
      ? t.unitedStates
      : locale === DEFAULT_LOCALE && region.countryLabel !== "your region"
        ? region.countryLabel
        : t.outsideCanada;

  return (
    <div className="border-b border-sky-500/25 bg-sky-500/10 px-4 py-2.5 text-center text-sm text-sky-50">
      <Globe className="mr-1.5 inline h-3.5 w-3.5" aria-hidden="true" />
      {t.visiting(where)}{" "}
      <Link
        href={localizePath("/#services", locale)}
        className="font-semibold text-white underline-offset-2 hover:underline"
      >
        {t.seeHow}
      </Link>
      {" · "}
      <Link href={localizePath("/locations", locale)} className="text-sky-100/90 hover:text-white">
        {t.cities}
      </Link>
    </div>
  );
}
