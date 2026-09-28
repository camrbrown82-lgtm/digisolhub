import type { Metadata } from "next";
import { ContactOptions } from "@/components/ContactOptions";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { QuickQuote } from "@/components/QuickQuote";
import { Guarantee } from "@/components/sections/Guarantee";
import {
  LocalPriceComparison,
  PackageComparison,
  PricingFaq,
  PricingIntro,
  PricingValue,
  pricingFaqJsonLd,
} from "@/components/sections/PricingExtras";
import { PricingSection } from "@/components/sections/PricingSection";
import { localizePath } from "@/lib/i18n/config";
import { getLocale, localizedMetadata } from "@/lib/i18n/server";
import { getMessages } from "@/lib/i18n/messages";
import { shareCardImages } from "@/lib/shareCard";
import { DIGISOL_SITE_URL } from "@/lib/site";

export function generateMetadata(): Metadata {
  const locale = getLocale();
  const t = getMessages(locale).pricingPage;
  return localizedMetadata(locale, "/pricing", {
    title: t.metaTitle,
    description: t.metaDescription,
    openGraph: {
      title: t.ogTitle,
      description: t.metaDescription,
      url: `${DIGISOL_SITE_URL}${localizePath("/pricing", locale)}`,
      type: "website",
      images: shareCardImages(t.shareAlt),
    },
  });
}

export default function PricingPage({
  searchParams,
}: {
  searchParams: { cancelled?: string; view?: string; promo?: string };
}) {
  const view = searchParams.view === "strong" ? "strong" : "default";
  const locale = getLocale();
  const t = getMessages(locale).pricingPage;
  return (
    <>
      <Navbar />
      <main id="main" className="pt-4">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(pricingFaqJsonLd(locale)) }}
        />
        {searchParams.cancelled ? (
          <p className="mx-auto max-w-6xl px-4 text-sm text-amber-200 sm:px-6 lg:px-8">
            {t.cancelled}
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
        <Guarantee />
        {view === "default" ? <LocalPriceComparison /> : null}
        <PricingFaq />
        <section className="border-t border-white/10 px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <QuickQuote location="pricing" heading={t.quoteHeading} sub={t.quoteSub} />
            <ContactOptions location="pricing" className="mt-4" />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
