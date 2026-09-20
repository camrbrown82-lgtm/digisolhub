import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { DispatchArchive } from "@/components/sections/DispatchArchive";
import { DIGISOL_SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "DigiSol Dispatch | Off-Page SEO Newsletter for Alberta",
  description:
    "The DigiSol Dispatch is a monthly off-page SEO newsletter for Alberta companies. Local SEO, citations, reviews, and Next.js notes for Airdrie, Calgary, Edmonton, and Red Deer.",
  alternates: {
    canonical: "/dispatch",
  },
  openGraph: {
    title: "DigiSol Dispatch | Off-Page SEO Newsletter for Alberta",
    description:
      "Monthly off-page SEO for Alberta companies. Read the latest issue and export it to socials.",
    url: `${DIGISOL_SITE_URL}/dispatch`,
    type: "website",
  },
};

export default function DispatchIndexPage() {
  return (
    <>
      <Navbar />
      <main id="main">
        <DispatchArchive />
      </main>
      <Footer />
    </>
  );
}
