import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { MarketingHomeStack } from "@/components/sections/MarketingHomeStack";
import {
  LOCATION_PAGES,
  getLocationPage,
  homeCopyForLocation,
  locationPath,
  locationUrl,
} from "@/lib/locations";
import {
  DIGISOL_CITY,
  DIGISOL_PHONE,
  DIGISOL_POSTAL_CODE,
  DIGISOL_SAME_AS,
  DIGISOL_SITE_URL,
  DIGISOL_STREET_ADDRESS,
} from "@/lib/site";

type PageProps = {
  params: { city: string };
};

export function generateStaticParams() {
  return LOCATION_PAGES.map((page) => ({ city: page.slug }));
}

export function generateMetadata({ params }: PageProps): Metadata {
  const page = getLocationPage(params.city);
  if (!page) return {};
  const title = `${page.headline} | DigiSol`;
  const description = page.subhead;
  const url = locationUrl(page.slug);
  return {
    title,
    description,
    keywords: page.keywords,
    alternates: { canonical: locationPath(page.slug) },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      locale: "en_CA",
      siteName: "DigiSol",
      images: [{ url: "/logo.jpg", alt: `DigiSol — ${page.name}` }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/logo.jpg"],
    },
  };
}

/** City lander = identical homepage stack; only copy names the city. */
export default function LocationCityPage({ params }: PageProps) {
  const page = getLocationPage(params.city);
  if (!page) notFound();

  const copy = homeCopyForLocation(page);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": ["LocalBusiness", "ProfessionalService"],
    name: "DigiSol",
    url: locationUrl(page.slug),
    image: `${DIGISOL_SITE_URL}/logo.jpg`,
    telephone: DIGISOL_PHONE,
    address: {
      "@type": "PostalAddress",
      streetAddress: DIGISOL_STREET_ADDRESS,
      addressLocality: DIGISOL_CITY,
      addressRegion: "AB",
      postalCode: DIGISOL_POSTAL_CODE,
      addressCountry: "CA",
    },
    areaServed: {
      "@type": "City",
      name: page.name,
      containedInPlace: {
        "@type": "AdministrativeArea",
        name: "Alberta",
      },
    },
    description: page.intro,
    sameAs: [...DIGISOL_SAME_AS],
  };

  return (
    <>
      <Navbar />
      <main id="main">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <MarketingHomeStack
          copy={copy}
          kaylevLocationName={page.name}
          analyticsKaylev={`locations_kaylev_${page.slug}`}
          market="alberta"
        />
      </main>
      <Footer />
    </>
  );
}
