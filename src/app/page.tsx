import { Footer } from "@/components/Footer";
import { GeoHomeBanner } from "@/components/GeoHomeBanner";
import { InternationalHomeBanner } from "@/components/InternationalHomeBanner";
import { Navbar } from "@/components/Navbar";
import { MarketingHomeStack } from "@/components/sections/MarketingHomeStack";
import { getVisitorRegion } from "@/lib/getVisitorRegion";
import { homeCopyForAudience } from "@/lib/visitorRegion";

/** Geo-personalized homepage — must not be statically cached globally. */
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const region = await getVisitorRegion();
  const copy = homeCopyForAudience(region.audience);

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
                : "homepage_kaylev_alberta"
          }
        />
      </main>
      <Footer />
    </>
  );
}
