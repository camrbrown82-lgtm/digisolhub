import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { GeoHomeBanner } from "@/components/GeoHomeBanner";
import { InternationalHomeBanner } from "@/components/InternationalHomeBanner";
import { Navbar } from "@/components/Navbar";
import { MarketingHomeStack } from "@/components/sections/MarketingHomeStack";
import { getVisitorRegion } from "@/lib/getVisitorRegion";
import { homeCopyGeneral } from "@/lib/homeCopy";
import { localizePath } from "@/lib/i18n/config";
import { getLocale, localizedMetadata } from "@/lib/i18n/server";
import { getMessages } from "@/lib/i18n/messages";
import { shareCardImages } from "@/lib/shareCard";
import { DIGISOL_SITE_URL } from "@/lib/site";

/** Geo-personalized homepage — must not be statically cached globally. */
export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  const locale = getLocale();
  const t = getMessages(locale).meta;
  return localizedMetadata(locale, "/", {
    title: t.homeTitle,
    description: t.homeDescription,
    openGraph: {
      title: t.homeTitle,
      description: t.homeShareDescription,
      url: `${DIGISOL_SITE_URL}${localizePath("/", locale)}`,
      siteName: "DigiSol",
      type: "website",
      images: shareCardImages(t.homeShareAlt),
    },
    twitter: {
      card: "summary_large_image",
      title: t.homeTitle,
      description: t.homeShareDescription,
      images: shareCardImages(t.homeShareAlt),
    },
  });
}

/**
 * Apex `/` = general MarketingHomeStack (not Alberta-locked).
 * Alberta city IPs redirect to `/locations/[city]` (city copy).
 * `/locations` hub keeps Alberta-wide copy.
 */
export default async function HomePage() {
  const region = await getVisitorRegion();
  const copy = homeCopyGeneral(getLocale());

  return (
    <>
      <Navbar />
      <InternationalHomeBanner region={region} />
      <GeoHomeBanner />
      <main id="main">
        <MarketingHomeStack
          copy={copy}
          analyticsKaylev={
            region.audience === "international"
              ? "homepage_kaylev_international"
              : region.audience === "canada"
                ? "homepage_kaylev_canada"
                : "homepage_kaylev_general"
          }
        />
      </main>
      <Footer />
    </>
  );
}
