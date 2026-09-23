import { Footer } from "@/components/Footer";
import { GeoHomeBanner } from "@/components/GeoHomeBanner";
import { InternationalHomeBanner } from "@/components/InternationalHomeBanner";
import { Navbar } from "@/components/Navbar";
import { MarketingHomeStack } from "@/components/sections/MarketingHomeStack";
import { getVisitorRegion } from "@/lib/getVisitorRegion";
import { homeCopyGeneral } from "@/lib/visitorRegion";

/** Geo-personalized homepage — must not be statically cached globally. */
export const dynamic = "force-dynamic";

/**
 * Apex `/` = general MarketingHomeStack (not Alberta-locked).
 * Alberta city IPs redirect to `/locations/[city]` (city copy).
 * `/locations` hub keeps Alberta-wide copy.
 */
export default async function HomePage() {
  const region = await getVisitorRegion();
  const copy = homeCopyGeneral();

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
