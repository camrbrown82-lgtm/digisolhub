import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { Contact } from "@/components/sections/Contact";
import { DualThreat } from "@/components/sections/DualThreat";
import { Hero } from "@/components/sections/Hero";
import { Services } from "@/components/sections/Services";
import { Audience } from "@/components/sections/Audience";

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main id="main">
        <Hero />
        <DualThreat />
        <Services />
        <Audience />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
