import Link from "next/link";
import { Globe } from "lucide-react";
import type { VisitorRegion } from "@/lib/visitorRegion";

/**
 * Lightweight banner for US / global visitors — signals DigiSol serves
 * beyond Alberta without changing the overall layout chrome.
 */
export function InternationalHomeBanner({ region }: { region: VisitorRegion }) {
  if (!region.isInternational) return null;

  const where =
    region.countryCode === "US"
      ? "the United States"
      : region.countryLabel !== "your region"
        ? region.countryLabel
        : "outside Canada";

  return (
    <div className="border-b border-sky-500/25 bg-sky-500/10 px-4 py-2.5 text-center text-sm text-sky-50">
      <Globe className="mr-1.5 inline h-3.5 w-3.5" aria-hidden="true" />
      Visiting from {where}? DigiSol builds websites and growth systems for
      companies everywhere.{" "}
      <Link
        href="/#services"
        className="font-semibold text-white underline-offset-2 hover:underline"
      >
        See how we work
      </Link>
      {" · "}
      <Link href="/locations" className="text-sky-100/90 hover:text-white">
        Alberta service cities
      </Link>
    </div>
  );
}
