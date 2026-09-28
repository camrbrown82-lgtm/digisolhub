import type { Metadata } from "next";
import Image from "next/image";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { CredentialsGallery } from "@/components/CredentialsGallery";
import { TrackedLink } from "@/components/TrackedLink";
import {
  CREDENTIALS_PAGE_PATH,
  CREDENTIALS_PAGE_URL,
  FOUNDER_BIO,
  FOUNDER_PHOTO,
} from "@/lib/credentials";
import { localizePath } from "@/lib/i18n/config";
import { getLocale, localizedMetadata } from "@/lib/i18n/server";
import { getMessages } from "@/lib/i18n/messages";
import { DIGISOL_FOUNDER, DIGISOL_FOUNDER_TITLE, DIGISOL_SITE_URL } from "@/lib/site";

export function generateMetadata(): Metadata {
  const locale = getLocale();
  const t = getMessages(locale).about;
  return localizedMetadata(locale, CREDENTIALS_PAGE_PATH, {
    title: t.metaTitle,
    description: t.metaDescription,
    openGraph: {
      title: t.ogTitle,
      description: t.ogDescription,
      url: `${DIGISOL_SITE_URL}${localizePath(CREDENTIALS_PAGE_PATH, locale)}`,
      siteName: "DigiSol",
      type: "profile",
      images: [
        {
          url: FOUNDER_PHOTO,
          alt: t.photoAlt(DIGISOL_FOUNDER),
        },
      ],
    },
  });
}

const personJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: DIGISOL_FOUNDER,
  jobTitle: DIGISOL_FOUNDER_TITLE,
  url: CREDENTIALS_PAGE_URL,
  image: `${DIGISOL_SITE_URL}${FOUNDER_PHOTO}`,
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
  const locale = getLocale();
  const t = getMessages(locale).about;
  const bio = t.bio ?? FOUNDER_BIO;
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
            {t.eyebrow}
          </p>
          <div className="mt-6 grid items-start gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.15fr)] lg:gap-14">
            <div className="space-y-6">
              <div className="relative aspect-[4/5] max-w-sm overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900 shadow-[0_24px_60px_-28px_rgba(79,70,229,0.55)]">
                <Image
                  src={FOUNDER_PHOTO}
                  alt={t.photoAlt(FOUNDER_BIO.name)}
                  fill
                  priority
                  className="object-cover object-[center_18%]"
                  sizes="(max-width: 1024px) 90vw, 380px"
                />
              </div>
              <div>
                <h1 className="text-balance text-4xl font-bold tracking-tight text-white sm:text-5xl">
                  {FOUNDER_BIO.name}
                </h1>
                <p className="mt-2 text-lg text-indigo-200">
                  {t.role(DIGISOL_FOUNDER_TITLE)}
                </p>
              </div>
            </div>

            <div className="space-y-5">
              <h2 className="text-balance text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                {bio.headline}
              </h2>
              {bio.body.map((paragraph) => (
                <p
                  key={paragraph.slice(0, 32)}
                  className="text-pretty text-base leading-relaxed text-zinc-300 sm:text-lg"
                >
                  {paragraph}
                </p>
              ))}
              <ul className="space-y-3 border-t border-zinc-800 pt-5">
                {bio.education.map((item) => (
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
                href={localizePath("/#contact", locale)}
                eventName="cta_click"
                eventParams={{
                  cta_name: "book_consultation",
                  location: "about",
                }}
                className="inline-flex rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
              >
                {t.cta}
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
              {t.certTitle}
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-zinc-400">{t.certBody}</p>
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
