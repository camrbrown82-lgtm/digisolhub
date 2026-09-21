import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { PricingSection } from "@/components/sections/PricingSection";
import { DIGISOL_SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Pricing | DigiSol — Scalable Website, SEO & Growth Packages",
  description:
    "Build DigiSol pricing for any Alberta industry: Foundation, Growth Engine, or Full Funnel packages with modular add-ons and Stripe checkout.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "DigiSol Pricing",
    description:
      "Scalable website design, development, local SEO, and paid media packages for Alberta companies.",
    url: `${DIGISOL_SITE_URL}/pricing`,
    type: "website",
  },
};

export default function PricingPage({
  searchParams,
}: {
  searchParams: { cancelled?: string };
}) {
  return (
    <>
      <Navbar />
      <main id="main" className="pt-4">
        {searchParams.cancelled ? (
          <p className="mx-auto max-w-6xl px-4 text-sm text-amber-200 sm:px-6 lg:px-8">
            Checkout cancelled — adjust your stack and try again anytime.
          </p>
        ) : null}
        <PricingSection />
      </main>
      <Footer />
    </>
  );
}
