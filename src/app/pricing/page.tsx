import type { Metadata } from "next";
import { ContactOptions } from "@/components/ContactOptions";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { QuickQuote } from "@/components/QuickQuote";
import {
  LocalPriceComparison,
  PackageComparison,
  PricingFaq,
  PricingIntro,
  PricingValue,
  pricingFaqJsonLd,
} from "@/components/sections/PricingExtras";
import { PricingSection } from "@/components/sections/PricingSection";
import { shareCardImages } from "@/lib/shareCard";
import { DIGISOL_SITE_URL } from "@/lib/site";

const description =
  "Transparent website pricing for Alberta businesses: custom websites from $4,500, Growth Engine with local SEO at $7,500, and Full Funnel with ads at $12,000 (CAD, plus GST). Compare packages, timelines and FAQs.";

export const metadata: Metadata = {
  title: "Pricing | DigiSol — Custom Websites from $4,500, SEO & Growth Packages",
  description,
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "DigiSol Pricing — Custom Websites from $4,500",
    description,
    url: `${DIGISOL_SITE_URL}/pricing`,
    type: "website",
    images: shareCardImages("DigiSol website, SEO, and marketing packages"),
  },
};

export default function PricingPage({
  searchParams,
}: {
  searchParams: { cancelled?: string; view?: string; promo?: string };
}) {
  const view = searchParams.view === "strong" ? "strong" : "default";
  return (
    <>
      <Navbar />
      <main id="main" className="pt-4">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(pricingFaqJsonLd()) }}
        />
        {searchParams.cancelled ? (
          <p className="mx-auto max-w-6xl px-4 text-sm text-amber-200 sm:px-6 lg:px-8">
            Checkout cancelled — adjust your stack and try again anytime.
          </p>
        ) : null}
        {view === "default" ? (
          <>
            <PricingIntro />
            <PricingValue />
            <PackageComparison />
          </>
        ) : null}
        <PricingSection view={view} promo={searchParams.promo} />
        {view === "default" ? <LocalPriceComparison /> : null}
        <PricingFaq />
        <section className="border-t border-white/10 px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <QuickQuote
              location="pricing"
              heading="Not sure which package fits? Get a free quote"
              sub="Tell us the basics. You get a clear, no-obligation quote, and you can ask for 50/50 invoicing."
            />
            <ContactOptions location="pricing" className="mt-4" />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
