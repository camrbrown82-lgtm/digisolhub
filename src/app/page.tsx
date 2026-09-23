import { Footer } from "@/components/Footer";
import { GeoHomeBanner } from "@/components/GeoHomeBanner";
import { InternationalHomeBanner } from "@/components/InternationalHomeBanner";
import { Navbar } from "@/components/Navbar";
import { Audience } from "@/components/sections/Audience";
import { Contact } from "@/components/sections/Contact";
import { DispatchArchive } from "@/components/sections/DispatchArchive";
import { DualThreat } from "@/components/sections/DualThreat";
import { Hero } from "@/components/sections/Hero";
import { Services } from "@/components/sections/Services";
import { WebsiteAudit } from "@/components/sections/WebsiteAudit";
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
        <Hero copy={copy} />
        <DualThreat copy={copy} />
        <Services copy={copy} />
        <WebsiteAudit copy={copy} />
        <Audience copy={copy} />
        <DispatchArchive />
        <Contact title={copy.contactTitle} body={copy.contactBody} />
      </main>
      <Footer />
    </>
  );
}
