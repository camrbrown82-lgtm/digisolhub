import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { DispatchArchive } from "@/components/sections/DispatchArchive";
import { shareCardImages } from "@/lib/shareCard";
import { DIGISOL_SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "DigiSol Dispatch | Local SEO & Growth Newsletter for Alberta",
  description:
    "The DigiSol Dispatch is a local SEO and growth newsletter for Alberta companies, two to four issues a month. Local SEO, website design, lead capture, and Next.js notes for Airdrie, Calgary, Edmonton, and Red Deer.",
  alternates: {
    canonical: "/dispatch",
  },
  openGraph: {
    title: "DigiSol Dispatch | Local SEO & Growth Newsletter for Alberta",
    description:
      "Local SEO and growth notes for Alberta companies. Read the latest issue and export it to socials.",
    url: `${DIGISOL_SITE_URL}/dispatch`,
    type: "website",
    images: shareCardImages("DigiSol Dispatch newsletter", { page: "dispatch" }),
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
