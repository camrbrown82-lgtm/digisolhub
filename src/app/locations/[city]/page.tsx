import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowRight, MapPin } from "lucide-react";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
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
      <main id="main" className="px-4 py-16 sm:px-6 lg:px-8">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <article className="mx-auto max-w-3xl">
          <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-indigo-400">
            <MapPin className="h-4 w-4" aria-hidden="true" />
            {page.regionLabel}
          </p>
          <h1 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-5xl">
            <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              {page.headline}
            </span>
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-zinc-300">{page.subhead}</p>
          <p className="mt-4 text-base leading-relaxed text-zinc-400">{page.intro}</p>

          <section className="mt-12" aria-labelledby="focus-heading">
            <h2
              id="focus-heading"
              className="text-2xl font-semibold tracking-tight text-white"
            >
              What we do for {page.name} companies
            </h2>
            <ul className="mt-6 space-y-3">
              {page.focus.map((item) => (
                <li
                  key={item}
                  className="flex gap-3 text-base leading-relaxed text-zinc-300"
                >
                  <span
                    className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400"
                    aria-hidden="true"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-sm text-zinc-500">
              Also serving {page.nearby}. DigiSol headquarters: {DIGISOL_ADDRESS_LINE}.
            </p>
          </section>

          <div className="mt-12 rounded-2xl border border-indigo-400/25 bg-indigo-500/10 p-6 text-center">
            <h2 className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-xl font-semibold text-transparent">
              Ready to grow in {page.name}?
            </h2>
            <p className="mt-2 text-sm text-zinc-400">
              Book a free consultation for website design, Next.js engineering,
              local SEO, and full-funnel CRO — we&apos;ll scale the plan to your
              industry.
            </p>
            <TrackedLink
              href="/#contact"
              eventName="cta_click"
              eventParams={{
                cta_name: "book_consultation",
                location: `locations_${page.slug}`,
              }}
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-500"
            >
              Book a Free Consultation
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </TrackedLink>
            <p className="mt-4 text-sm text-zinc-500">
              Or{" "}
              <TrackedLink
                href="/pricing"
                eventName="cta_click"
                eventParams={{
                  cta_name: "view_pricing",
                  location: `locations_${page.slug}`,
                }}
                className="font-medium text-indigo-300 underline-offset-2 hover:underline"
              >
                browse DigiSol pricing
              </TrackedLink>
              .
            </p>
          </div>

          <nav className="mt-12" aria-label="Other DigiSol service cities">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
              More Alberta cities
            </h2>
            <ul className="mt-4 flex flex-wrap gap-3">
              {otherCities.map((city) => (
                <li key={city.slug}>
                  <TrackedLink
                    href={locationPath(city.slug)}
                    eventName="location_nav"
                    eventParams={{ city: city.slug, from: page.slug }}
                    className="inline-flex rounded-full border border-white/15 px-4 py-2 text-sm text-zinc-200 transition hover:bg-white/5"
                  >
                    {city.name}
                  </TrackedLink>
                </li>
              ))}
            </ul>
          </nav>
        </article>
      </main>
      <Footer />
    </>
  );
}
