import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { StickyHomeTop } from "@/components/StickyHomeTop";
import { Audience } from "@/components/sections/Audience";
import { Contact } from "@/components/sections/Contact";
import { DualThreat } from "@/components/sections/DualThreat";
import { Hero } from "@/components/sections/Hero";
import { Services } from "@/components/sections/Services";

export default function HomePage() {
  return (
    <>
      <StickyHomeTop>
        <Navbar sticky={false} />
        <Hero />
      </StickyHomeTop>
      <main id="main">
        <DualThreat />
        <Services />
        <Audience />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
