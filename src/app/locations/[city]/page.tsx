import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { MarketingHomeStack } from "@/components/sections/MarketingHomeStack";
import { homeCopyForLocation, localizedLocationPage } from "@/lib/homeCopy";
import { LOCALE_META, localizePath, type Locale } from "@/lib/i18n/config";
import { getLocale, localizedMetadata } from "@/lib/i18n/server";
import { getMessages } from "@/lib/i18n/messages";
import { shareCardImages, shareCardPath } from "@/lib/shareCard";
import { LOCATION_PAGES, locationPath, type LocationPage } from "@/lib/locations";
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

const localizedUrl = (page: LocationPage, locale: Locale) =>
  `${DIGISOL_SITE_URL}${localizePath(locationPath(page.slug), locale)}`;

export function generateMetadata({ params }: PageProps): Metadata {
  const locale = getLocale();
  const page = localizedLocationPage(params.city, locale);
  if (!page) return {};
  const title = `${page.headline} | DigiSol`;
  const description = page.subhead;
  return localizedMetadata(locale, locationPath(page.slug), {
    title,
    description,
    keywords: page.keywords,
    openGraph: {
      title,
      description,
      url: localizedUrl(page, locale),
      type: "website",
      siteName: "DigiSol",
      images: shareCardImages(getMessages(locale).meta.cityShareAlt(page.name), page.slug),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [shareCardPath(page.slug)],
    },
  });
}

function buildLocalBusinessJsonLd(page: LocationPage, locale: Locale) {
  const isAirdrie = page.slug === "airdrie";
  const t = getMessages(locale).cityJsonLd;
  const url = localizedUrl(page, locale);
  return {
    "@context": "https://schema.org",
    "@type": ["LocalBusiness", "ProfessionalService"],
    "@id": `${url}#business`,
    name: "DigiSol",
    url,
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
          name: isAirdrie ? t.offerDesignHome : t.offerDesign(page.name),
          serviceType: ["Website Design", "Web Development"],
          areaServed: page.name,
        },
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: isAirdrie ? t.offerMarketingHome : t.offerMarketing(page.name),
          serviceType: ["Digital Marketing", "Local SEO", "Google Ads", "Meta Ads"],
          areaServed: page.name,
        },
      },
    ],
  };
}

function buildFaqJsonLd(page: LocationPage, locale: Locale) {
  const city = page.name;
  const isAirdrie = page.slug === "airdrie";
  const t = getMessages(locale).cityJsonLd;
  const address = `${DIGISOL_STREET_ADDRESS}, ${DIGISOL_CITY}, AB ${DIGISOL_POSTAL_CODE}`;
  const qa = (name: string, text: string) => ({
    "@type": "Question",
    name,
    acceptedAnswer: { "@type": "Answer", text },
  });
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: LOCALE_META[locale].intl,
    mainEntity: [
      qa(isAirdrie ? t.q1Home : t.q1(city), isAirdrie ? t.a1Home : t.a1(city)),
      qa(isAirdrie ? t.q2Home : t.q2(city), t.a2(city)),
      qa(t.q3, t.a3(address, DIGISOL_PHONE)),
    ],
  };
}

/** City lander = homepage stack + unique local-intent SEO section. */
export default function LocationCityPage({ params }: PageProps) {
  const locale = getLocale();
  const page = localizedLocationPage(params.city, locale);
  if (!page) notFound();

  const copy = homeCopyForLocation(page, locale);
  const businessJsonLd = buildLocalBusinessJsonLd(page, locale);
  const faqJsonLd = buildFaqJsonLd(page, locale);

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
