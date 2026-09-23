import type { Metadata } from "next";
import { ArrowRight, MapPin } from "lucide-react";
import { BrandCard, brandAccent } from "@/components/BrandCard";
import { Footer } from "@/components/Footer";
import { GoogleRating, ListingLinks } from "@/components/LocalListings";
import { Navbar } from "@/components/Navbar";
import { KaylevValueProp } from "@/components/sections/KaylevValueProp";
import { TrackedLink } from "@/components/TrackedLink";
import { LOCATION_PAGES, locationPath } from "@/lib/locations";
import { DIGISOL_ADDRESS_LINE, DIGISOL_SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Alberta Service Cities | DigiSol",
  description:
    "DigiSol website design, development, and local SEO for Calgary, Edmonton, Red Deer, Cochrane, and Airdrie. Local landing pages for Alberta searches.",
  alternates: { canonical: "/locations" },
  openGraph: {
    title: "Alberta Service Cities | DigiSol",
    description:
      "City landing pages for DigiSol services across Calgary, Edmonton, Red Deer, Cochrane, and Airdrie.",
    url: `${DIGISOL_SITE_URL}/locations`,
    type: "website",
  },
};

/** Alberta-wide hub — IP geo sends city visitors to /locations/[city]; this page targets all markets. */
export default function LocationsIndexPage() {
  return (
    <>
      <Navbar />
      <main id="main">
        <section
          id="top"
          className="relative overflow-hidden px-4 py-16 sm:px-6 sm:py-24 lg:px-8"
          aria-labelledby="locations-heading"
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
              DigiSol service areas · Alberta-wide
            </p>
            <h1
              id="locations-heading"
              className="text-balance text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl"
            >
              <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                Website design &amp; local SEO across Alberta
              </span>
            </h1>
            <p className="mx-auto mt-8 max-w-3xl text-balance text-2xl font-semibold tracking-tight text-zinc-100 sm:text-3xl">
              One partner for every market we serve — not a different agency in
              each city.
            </p>
            <p className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-relaxed text-zinc-300 sm:text-lg">
              DigiSol builds custom websites, runs local SEO and paid campaigns,
              and helps companies convert nearby demand in Calgary, Edmonton, Red
              Deer, Cochrane, and our Airdrie home base — plus clients farther
              afield.
            </p>
            <p className="mx-auto mt-4 max-w-2xl text-sm font-medium tracking-wide text-indigo-300">
              Airdrie · Calgary · Edmonton · Red Deer · Cochrane · Across Alberta
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <TrackedLink
                href="/#contact"
                eventName="cta_click"
                eventParams={{
                  cta_name: "book_consultation",
                  location: "locations_index_hero",
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
                  location: "locations_index_hero",
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

        <section
          className="border-t border-white/10 px-4 py-20 sm:px-6 lg:px-8"
          aria-labelledby="cities-heading"
        >
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
              <p className="text-sm font-semibold uppercase tracking-wider text-indigo-400">
                Pick your city
              </p>
              <h2
                id="cities-heading"
                className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl"
              >
                Local landers for Alberta search
              </h2>
              <p className="mt-4 text-zinc-400">
                IP geo routes visitors to their city page when we can detect it.
                Use these links anytime — DigiSol HQ: {DIGISOL_ADDRESS_LINE}.
              </p>
            </div>
            <ul className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
              {LOCATION_PAGES.map((city, index) => {
                const accent =
                  index % 2 === 0 ? ("sky" as const) : ("indigo" as const);
                const styles = brandAccent[accent];
                return (
                  <li key={city.slug} className="h-full">
                    <TrackedLink
                      href={locationPath(city.slug)}
                      eventName="location_nav"
                      eventParams={{ city: city.slug, from: "index" }}
                      className="block h-full"
                    >
                      <BrandCard
                        accent={accent}
                        className="h-full transition hover:brightness-110"
                      >
                        <span
                          className={`inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold uppercase tracking-wider ${styles.icon}`}
                        >
                          <MapPin
                            className="h-3.5 w-3.5"
                            aria-hidden="true"
                          />
                          {city.regionLabel}
                        </span>
                        <span className="mt-5 block text-xl font-semibold text-white">
                          {city.name}
                        </span>
                        <span className="mt-2 block text-sm leading-relaxed text-zinc-300">
                          {city.subhead}
                        </span>
                      </BrandCard>
                    </TrackedLink>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        <KaylevValueProp analyticsLocation="locations_kaylev_index" />

        <section className="border-t border-white/10 px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <BrandCard accent="indigo">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-white sm:text-2xl">
                  Ready to grow across Alberta?
                </h2>
                <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-zinc-200">
                  Book a free consultation for website design, Next.js
                  engineering, local SEO, and full-funnel CRO — we&apos;ll scale
                  the plan to your city and industry.
                </p>
                <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <TrackedLink
                    href="/#contact"
                    eventName="cta_click"
                    eventParams={{
                      cta_name: "book_consultation",
                      location: "locations_index",
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
                      location: "locations_index",
                    }}
                    className="inline-flex items-center justify-center rounded-full border border-blue-400/40 bg-blue-500/10 px-6 py-3 text-sm font-semibold text-blue-200 transition hover:border-blue-300 hover:bg-blue-500/20"
                  >
                    Browse DigiSol pricing
                  </TrackedLink>
                </div>
              </div>
            </BrandCard>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
