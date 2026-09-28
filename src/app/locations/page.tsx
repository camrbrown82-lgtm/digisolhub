import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { MarketingHomeStack } from "@/components/sections/MarketingHomeStack";
import { homeCopyForLocationsHub } from "@/lib/homeCopy";
import { localizePath } from "@/lib/i18n/config";
import { getLocale, localizedMetadata } from "@/lib/i18n/server";
import { getMessages } from "@/lib/i18n/messages";
import { shareCardImages } from "@/lib/shareCard";
import { DIGISOL_SITE_URL } from "@/lib/site";

export function generateMetadata(): Metadata {
  const locale = getLocale();
  const t = getMessages(locale).meta;
  return localizedMetadata(locale, "/locations", {
    title: t.locationsTitle,
    description: t.locationsDescription,
    openGraph: {
      title: t.locationsTitle,
      description: t.locationsShareDescription,
      url: `${DIGISOL_SITE_URL}${localizePath("/locations", locale)}`,
      type: "website",
      images: shareCardImages(t.locationsShareAlt, { page: "locations", locale }),
    },
  });
}

/** Alberta-wide geo hub = identical homepage stack; copy is not locked to one city. */
export default function LocationsIndexPage() {
  const copy = homeCopyForLocationsHub(getLocale());

  return (
    <>
      <Navbar />
      <main id="main">
        <MarketingHomeStack
          copy={copy}
          analyticsKaylev="locations_kaylev_index"
          market="alberta"
        />
      </main>
      <Footer />
    </>
  );
}
