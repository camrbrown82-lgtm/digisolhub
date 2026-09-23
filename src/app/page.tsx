import { Footer } from "@/components/Footer";
import { GeoHomeBanner } from "@/components/GeoHomeBanner";
import { Navbar } from "@/components/Navbar";
import { VisitorChat } from "@/components/VisitorChat";
import { Audience } from "@/components/sections/Audience";
import { Contact } from "@/components/sections/Contact";
import { DispatchArchive } from "@/components/sections/DispatchArchive";
import { DualThreat } from "@/components/sections/DualThreat";
import { Hero } from "@/components/sections/Hero";
import { Services } from "@/components/sections/Services";
import { WebsiteAudit } from "@/components/sections/WebsiteAudit";

export default function HomePage() {
  return (
    <>
      <Navbar />
      <GeoHomeBanner />
      <main id="main">
        <Hero />
        <DualThreat />
        <Services />
        <WebsiteAudit />
        <Audience />
        <DispatchArchive />
        <Contact />
      </main>
      <Footer />
      <VisitorChat />
    </>
  );
}
