import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { CredentialsGallery } from "@/components/CredentialsGallery";
import { TrackedLink } from "@/components/TrackedLink";
import {
  CREDENTIALS_PAGE_PATH,
  CREDENTIALS_PAGE_URL,
  FOUNDER_BIO,
} from "@/lib/credentials";
import { DIGISOL_FOUNDER, DIGISOL_FOUNDER_TITLE, DIGISOL_SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "About Cameron Brown | Credentials & Certifications | DigiSol",
  description:
    "Meet DigiSol founder Cameron Brown — career change from commercial sheet metal into website design, full-stack development, and digital marketing. Sundance College honors graduate, Mimo full-stack training, and HubSpot Academy certifications.",
  alternates: { canonical: CREDENTIALS_PAGE_PATH },
  openGraph: {
    title: "About Cameron Brown | DigiSol",
    description:
      "Passion for design, engineering, and growth — with HubSpot certifications, a Sundance College diploma (honors), and full-stack training from Mimo.",
    url: CREDENTIALS_PAGE_URL,
    siteName: "DigiSol",
    locale: "en_CA",
    type: "profile",
    images: [{ url: "/logo.jpg", alt: "DigiSol" }],
  },
};

const personJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: DIGISOL_FOUNDER,
  jobTitle: DIGISOL_FOUNDER_TITLE,
  url: CREDENTIALS_PAGE_URL,
  worksFor: {
    "@type": "Organization",
    name: "DigiSol",
    url: DIGISOL_SITE_URL,
  },
  alumniOf: [
    { "@type": "CollegeOrUniversity", name: "Sundance College" },
    { "@type": "Organization", name: "Mimo" },
  ],
};

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <main id="main" className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-600/20 via-zinc-950 to-zinc-950"
          aria-hidden="true"
        />
        <section className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <p className="text-sm font-medium tracking-wide text-indigo-300">
            About · Credentials
          </p>
          <div className="mt-6 grid items-start gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.15fr)] lg:gap-14">
            <div className="space-y-6">
              <div
                className="flex aspect-[4/5] max-w-sm flex-col items-center justify-center rounded-3xl border border-dashed border-indigo-400/35 bg-gradient-to-b from-indigo-500/10 to-zinc-900/60 px-6 text-center"
                aria-label="Profile photo coming soon"
              >
                <div className="flex h-28 w-28 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-3xl font-semibold text-indigo-200">
                  CB
                </div>
                <p className="mt-5 text-sm font-medium text-zinc-200">
                  Profile photo coming soon
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Space reserved for Cameron&apos;s headshot
                </p>
              </div>
              <div>
                <h1 className="text-balance text-4xl font-bold tracking-tight text-white sm:text-5xl">
                  {FOUNDER_BIO.name}
                </h1>
                <p className="mt-2 text-lg text-indigo-200">
                  {DIGISOL_FOUNDER_TITLE}, DigiSol
                </p>
              </div>
            </div>

            <div className="space-y-5">
              <h2 className="text-balance text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                {FOUNDER_BIO.headline}
              </h2>
              {FOUNDER_BIO.body.map((paragraph) => (
                <p
                  key={paragraph.slice(0, 32)}
                  className="text-pretty text-base leading-relaxed text-zinc-300 sm:text-lg"
                >
                  {paragraph}
                </p>
              ))}
              <ul className="space-y-3 border-t border-zinc-800 pt-5">
                {FOUNDER_BIO.education.map((item) => (
                  <li key={item.title}>
                    <p className="font-medium text-white">{item.title}</p>
                    <p className="text-sm text-zinc-400">
                      {item.school}
                      {item.note ? ` · ${item.note}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
              <TrackedLink
                href="/#contact"
                eventName="cta_click"
                eventParams={{
                  cta_name: "book_consultation",
                  location: "about",
                }}
                className="inline-flex rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
              >
                Book a free consultation
              </TrackedLink>
            </div>
          </div>
        </section>

        <section
          id="credentials"
          className="relative border-t border-zinc-800/80 bg-zinc-950/80 px-4 py-16 sm:px-6 lg:px-8"
        >
          <div className="mx-auto max-w-6xl">
            <h2 className="text-3xl font-semibold tracking-tight text-white">
              Certificates &amp; badges
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-zinc-400">
              HubSpot Academy certifications, SIMnet Microsoft Word belts, and
              supporting documents — proof behind the DigiSol craft.
            </p>
            <div className="mt-8">
              <CredentialsGallery />
            </div>
          </div>
        </section>
      </main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
      />
      <Footer />
    </>
  );
}
