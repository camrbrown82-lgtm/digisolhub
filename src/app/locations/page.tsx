import type { Metadata } from "next";
import { MapPin } from "lucide-react";
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
      <main id="main" className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-400">
            DigiSol service areas
          </p>
          <h1 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-5xl">
            <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              Website design & local SEO across Alberta
            </span>
          </h1>
          <p className="mt-4 text-zinc-400">
            City pages built for local search — Calgary, Edmonton, Red Deer,
            Cochrane, and our Airdrie home base.
          </p>
        </div>
        <ul className="mx-auto mt-12 grid max-w-3xl gap-4 sm:grid-cols-2">
          {LOCATION_PAGES.map((city) => (
            <li key={city.slug}>
              <TrackedLink
                href={locationPath(city.slug)}
                eventName="location_nav"
                eventParams={{ city: city.slug, from: "index" }}
                className="flex h-full flex-col rounded-2xl border border-white/10 bg-zinc-900/40 p-5 text-left transition hover:border-indigo-400/40 hover:bg-zinc-900/70"
              >
                <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-300">
                  <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                  {city.regionLabel}
                </span>
                <span className="mt-3 text-xl font-semibold text-white">
                  {city.name}
                </span>
                <span className="mt-2 text-sm leading-relaxed text-zinc-400">
                  {city.subhead}
                </span>
              </TrackedLink>
            </li>
          ))}
        </ul>
      </main>
      <Footer />
    </>
  );
}
