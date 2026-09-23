import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { MarketingHomeStack } from "@/components/sections/MarketingHomeStack";
import { homeCopyForLocationsHub } from "@/lib/locations";
import { DIGISOL_SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Alberta Service Cities | DigiSol",
  description:
    "DigiSol website design, development, and local SEO for Calgary, Edmonton, Red Deer, Cochrane, and Airdrie. Same full DigiSol experience — Alberta-wide.",
  alternates: { canonical: "/locations" },
  openGraph: {
    title: "Alberta Service Cities | DigiSol",
    description:
      "Full DigiSol homepage experience for Alberta-wide search — design, engineering, marketing, Kaylev, audit video, and contact.",
    url: `${DIGISOL_SITE_URL}/locations`,
    type: "website",
  },
};

/** Alberta-wide geo hub = identical homepage stack; copy is not locked to one city. */
export default function LocationsIndexPage() {
  const copy = homeCopyForLocationsHub();

  return (
    <>
      <Navbar />
      <main id="main">
        <MarketingHomeStack
          copy={copy}
          analyticsKaylev="locations_kaylev_index"
        />
      </main>
      <Footer />
    </>
  );
}
