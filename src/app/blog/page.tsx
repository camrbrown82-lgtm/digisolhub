import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { BlogHighlights } from "@/components/sections/BlogHighlights";
import { DispatchArchive } from "@/components/sections/DispatchArchive";
import { shareCardImages } from "@/lib/shareCard";
import { DIGISOL_SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "DigiSol Guides | Local SEO, Google Reviews & Website Advice for Alberta Businesses",
  description:
    "Free, practical guides for Alberta small businesses: getting more Google reviews, Google Business Profile setup, website costs, and local SEO for Airdrie, Calgary, and beyond.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "DigiSol Guides for Alberta Businesses",
    description:
      "Practical advice on Google reviews, local search, and websites that bring in customers.",
    url: `${DIGISOL_SITE_URL}/blog`,
    type: "website",
    images: shareCardImages("DigiSol guides for Alberta businesses"),
  },
};

export default function BlogIndexPage() {
  return (
    <>
      <Navbar />
      <main id="main">
        <BlogHighlights limit={0} headingLevel="h1" location="blog_index" />
        <DispatchArchive />
      </main>
      <Footer />
    </>
  );
}
