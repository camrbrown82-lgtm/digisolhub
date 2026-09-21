import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { Audience } from "@/components/sections/Audience";
import { Contact } from "@/components/sections/Contact";
import { DispatchArchive } from "@/components/sections/DispatchArchive";
import { DualThreat } from "@/components/sections/DualThreat";
import { Hero } from "@/components/sections/Hero";
import { Services } from "@/components/sections/Services";

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main id="main">
        <Hero />
        <DualThreat />
        <Services />
        <Audience />
        <DispatchArchive />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
