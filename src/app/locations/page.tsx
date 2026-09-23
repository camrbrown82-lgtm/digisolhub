import type { Metadata } from "next";
import { MapPin } from "lucide-react";
import { BrandCard, brandAccent } from "@/components/BrandCard";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { TrackedLink } from "@/components/TrackedLink";
import { LOCATION_PAGES, locationPath } from "@/lib/locations";
import { DIGISOL_SITE_URL } from "@/lib/site";

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

export default function LocationsIndexPage() {
  return (
    <>
      <Navbar />
      <main id="main">
        <section
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
              DigiSol service areas
            </p>
            <h1
              id="locations-heading"
              className="text-balance text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl"
            >
              <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                Website design &amp; local SEO across Alberta
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-relaxed text-zinc-300 sm:text-lg">
              City pages built for local search — Calgary, Edmonton, Red Deer,
              Cochrane, and our Airdrie home base.
            </p>
          </div>
        </section>

        <section className="border-t border-white/10 px-4 pb-20 sm:px-6 lg:px-8">
          <ul className="mx-auto grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-2">
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
                    <BrandCard accent={accent} className="h-full transition hover:brightness-110">
                      <span
                        className={`inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold uppercase tracking-wider ${styles.icon}`}
                      >
                        <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
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
        </section>
      </main>
      <Footer />
    </>
  );
}
