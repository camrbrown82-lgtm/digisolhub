"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { useLocalizedHref, useMessages } from "@/lib/i18n/client";
import { LOCATION_PAGES, locationPath } from "@/lib/locations";

function readCookie(name: string) {
  if (typeof document === "undefined") return "";
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=").slice(1).join("=")) : "";
}

/** Soft prompt when someone is on the apex home after geo landing expired. */
export function GeoHomeBanner() {
  const [slug, setSlug] = useState("");
  const t = useMessages().geoBanner;
  const localize = useLocalizedHref();

  useEffect(() => {
    const value = readCookie("ds_geo_slug");
    if (LOCATION_PAGES.some((page) => page.slug === value)) {
      setSlug(value);
    }
  }, []);

  if (!slug) return null;
  const page = LOCATION_PAGES.find((item) => item.slug === slug);
  if (!page) return null;

  return (
    <div className="border-b border-indigo-500/30 bg-indigo-500/10 px-4 py-2.5 text-center text-sm text-indigo-100">
      <MapPin className="mr-1.5 inline h-3.5 w-3.5" aria-hidden="true" />
      {t.looking(page.name)}{" "}
      <Link
        href={localize(locationPath(slug))}
        className="font-semibold text-white underline-offset-2 hover:underline"
      >
        {t.open(page.name)}
      </Link>
      {" · "}
      <Link href={localize("/?home=1")} className="text-indigo-200/90 hover:text-white">
        {t.stay}
      </Link>
    </div>
  );
}
