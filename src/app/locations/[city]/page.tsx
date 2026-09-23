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
  DIGISOL_GEO,
  DIGISOL_GOOGLE_LISTING_URL,
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

function buildLocalBusinessJsonLd(page: NonNullable<ReturnType<typeof getLocationPage>>) {
  const isAirdrie = page.slug === "airdrie";
  return {
    "@context": "https://schema.org",
    "@type": ["LocalBusiness", "ProfessionalService"],
    "@id": `${locationUrl(page.slug)}#business`,
    name: "DigiSol",
    url: locationUrl(page.slug),
    image: `${DIGISOL_SITE_URL}/logo.jpg`,
    telephone: DIGISOL_PHONE,
    priceRange: "$$",
    address: {
      "@type": "PostalAddress",
      streetAddress: DIGISOL_STREET_ADDRESS,
      addressLocality: DIGISOL_CITY,
      addressRegion: "AB",
      postalCode: DIGISOL_POSTAL_CODE,
      addressCountry: "CA",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: DIGISOL_GEO.latitude,
      longitude: DIGISOL_GEO.longitude,
    },
    hasMap: DIGISOL_GOOGLE_LISTING_URL,
    areaServed: {
      "@type": "City",
      name: page.name,
      containedInPlace: {
        "@type": "AdministrativeArea",
        name: "Alberta",
      },
    },
    knowsAbout: page.keywords,
    description: page.intro,
    sameAs: [...DIGISOL_SAME_AS],
    makesOffer: [
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: isAirdrie
            ? "Airdrie web design and development"
            : `Website design and development in ${page.name}`,
          serviceType: ["Website Design", "Web Development"],
          areaServed: page.name,
        },
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: isAirdrie
            ? "Airdrie marketing and local SEO"
            : `Digital marketing and local SEO in ${page.name}`,
          serviceType: ["Digital Marketing", "Local SEO", "Google Ads", "Meta Ads"],
          areaServed: page.name,
        },
      },
    ],
  };
}

function buildFaqJsonLd(page: NonNullable<ReturnType<typeof getLocationPage>>) {
  const city = page.name;
  const isAirdrie = page.slug === "airdrie";
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: isAirdrie
          ? "Who offers web design and development in Airdrie?"
          : `Who offers website design and development in ${city}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: isAirdrie
            ? "DigiSol is an Airdrie-based studio that designs and builds custom websites (Next.js) for local businesses, then markets them with local SEO and paid campaigns."
            : `DigiSol designs and builds custom websites for ${city} businesses from our Airdrie headquarters, with local SEO and campaigns aimed at ${city} and nearby markets.`,
        },
      },
      {
        "@type": "Question",
        name: isAirdrie
          ? "Does DigiSol offer Airdrie marketing and SEO?"
          : `Does DigiSol offer marketing and SEO in ${city}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `Yes. DigiSol runs local SEO, Google Ads, and Meta campaigns for ${city}, plus conversion work so traffic turns into booked consultations.`,
        },
      },
      {
        "@type": "Question",
        name: "Where is DigiSol located?",
        acceptedAnswer: {
          "@type": "Answer",
          text: `DigiSol is headquartered at ${DIGISOL_STREET_ADDRESS}, ${DIGISOL_CITY}, AB ${DIGISOL_POSTAL_CODE}. Phone ${DIGISOL_PHONE}.`,
        },
      },
    ],
  };
}

/** City lander = homepage stack + unique local-intent SEO section. */
export default function LocationCityPage({ params }: PageProps) {
  const page = getLocationPage(params.city);
  if (!page) notFound();

  const copy = homeCopyForLocation(page);
  const businessJsonLd = buildLocalBusinessJsonLd(page);
  const faqJsonLd = buildFaqJsonLd(page);

  return (
    <>
      <Navbar />
      <main id="main">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(businessJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
        <MarketingHomeStack
          copy={copy}
          kaylevLocationName={page.name}
          analyticsKaylev={`locations_kaylev_${page.slug}`}
          market="alberta"
          locationPage={page}
        />
      </main>
      <Footer />
    </>
  );
}
