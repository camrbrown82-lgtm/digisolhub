import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowRight, MapPin, Sparkles } from "lucide-react";
import { Footer } from "@/components/Footer";
import { GoogleRating, ListingLinks } from "@/components/LocalListings";
import { Navbar } from "@/components/Navbar";
import { BrandCard, brandAccent } from "@/components/BrandCard";
import { KaylevValueProp } from "@/components/sections/KaylevValueProp";
import { TrackedLink } from "@/components/TrackedLink";
import {
  LOCATION_PAGES,
  getLocationPage,
  locationPath,
  locationUrl,
} from "@/lib/locations";
import {
  DIGISOL_ADDRESS_LINE,
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

export default function LocationCityPage({ params }: PageProps) {
  const page = getLocationPage(params.city);
  if (!page) notFound();

  const otherCities = LOCATION_PAGES.filter((item) => item.slug !== page.slug);
  const analyticsLocation = `locations_${page.slug}`;
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

        {/* Hero — same chrome & centering as homepage Hero */}
        <section
          id="top"
          className="relative overflow-hidden px-4 py-16 sm:px-6 sm:py-24 lg:px-8"
          aria-labelledby="location-hero-heading"
        >
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-600/20 via-zinc-950 to-zinc-950"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgb(255_255_255/0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.04)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]"
            aria-hidden="true"
          />
          <div className="relative mx-auto max-w-5xl text-center">
            <p className="mb-8 inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3 py-1.5 text-xs font-medium tracking-wide text-indigo-300 sm:text-sm">
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {page.regionLabel}
            </p>
            <h1
              id="location-hero-heading"
              className="text-balance text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl"
            >
              <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                {page.headline}
              </span>
            </h1>
            <p className="mx-auto mt-8 max-w-3xl text-balance text-2xl font-semibold tracking-tight text-zinc-100 sm:text-3xl">
              {page.subhead}
            </p>
            <p className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-relaxed text-zinc-300 sm:text-lg">
              {page.intro}
            </p>
            <p className="mx-auto mt-4 max-w-2xl text-sm font-medium tracking-wide text-indigo-300">
              Also serving {page.nearby}
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <TrackedLink
                href="/#contact"
                eventName="cta_click"
                eventParams={{
                  cta_name: "book_consultation",
                  location: `${analyticsLocation}_hero`,
                }}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 sm:w-auto"
              >
                Book a Free Consultation
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </TrackedLink>
              <TrackedLink
                href="/#services"
                eventName="cta_click"
                eventParams={{
                  cta_name: "explore_services",
                  location: `${analyticsLocation}_hero`,
                }}
                className="inline-flex w-full items-center justify-center rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 sm:w-auto"
              >
                Explore Services
              </TrackedLink>
            </div>
            <ListingLinks location="hero" />
            <div className="mt-5 flex justify-center">
              <GoogleRating location="hero" />
            </div>
          </div>
        </section>

        {/* Focus — same centered header + BrandCard pattern as homepage sections */}
        <section
          className="border-t border-white/10 px-4 py-20 sm:px-6 lg:px-8"
          aria-labelledby="focus-heading"
        >
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
              <p className="text-sm font-semibold uppercase tracking-wider text-indigo-400">
                Local focus
              </p>
              <h2
                id="focus-heading"
                className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl"
              >
                What we do for {page.name} companies
              </h2>
              <p className="mt-4 text-zinc-400">
                DigiSol headquarters: {DIGISOL_ADDRESS_LINE}.
              </p>
            </div>
            <ul className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
              {page.focus.map((item, index) => {
                const accent =
                  index % 2 === 0
                    ? ("blue" as const)
                    : ("indigo" as const);
                const styles = brandAccent[accent];
                return (
                  <li key={item} className="h-full">
                    <BrandCard accent={accent} className="h-full">
                      <span
                        className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${styles.icon}`}
                      >
                        <Sparkles className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <p className="mt-4 text-base leading-relaxed text-zinc-200">
                        {item}
                      </p>
                    </BrandCard>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        <KaylevValueProp
          locationName={page.name}
          analyticsLocation={`locations_kaylev_${page.slug}`}
        />

        <section className="border-t border-white/10 px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <BrandCard accent="indigo">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-white sm:text-2xl">
                  Ready to grow in {page.name}?
                </h2>
                <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-zinc-200">
                  Book a free consultation for website design, Next.js
                  engineering, local SEO, and full-funnel CRO — we&apos;ll scale
                  the plan to your industry.
                </p>
                <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <TrackedLink
                    href="/#contact"
                    eventName="cta_click"
                    eventParams={{
                      cta_name: "book_consultation",
                      location: analyticsLocation,
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-500"
                  >
                    Book a Free Consultation
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </TrackedLink>
                  <TrackedLink
                    href="/pricing"
                    eventName="cta_click"
                    eventParams={{
                      cta_name: "view_pricing",
                      location: analyticsLocation,
                    }}
                    className="inline-flex items-center justify-center rounded-full border border-blue-400/40 bg-blue-500/10 px-6 py-3 text-sm font-semibold text-blue-200 transition hover:border-blue-300 hover:bg-blue-500/20"
                  >
                    Browse DigiSol pricing
                  </TrackedLink>
                </div>
              </div>
            </BrandCard>

            <nav
              className="mt-16"
              aria-label="Other DigiSol service cities"
            >
              <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
                <p className="text-sm font-semibold uppercase tracking-wider text-indigo-400">
                  More Alberta cities
                </p>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">
                  DigiSol service areas
                </h2>
              </div>
              <ul className="mt-8 flex flex-wrap items-center justify-center gap-3">
                {otherCities.map((city) => (
                  <li key={city.slug}>
                    <TrackedLink
                      href={locationPath(city.slug)}
                      eventName="location_nav"
                      eventParams={{ city: city.slug, from: page.slug }}
                      className="inline-flex rounded-full border border-white/15 px-4 py-2 text-sm text-zinc-200 transition hover:border-indigo-400/40 hover:bg-white/5"
                    >
                      {city.name}
                    </TrackedLink>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
