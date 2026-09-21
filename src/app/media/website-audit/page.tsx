import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { TrackedLink } from "@/components/TrackedLink";
import { WebsiteAuditVideo } from "@/components/WebsiteAuditVideo";
import {
  WEBSITE_AUDIT_DESCRIPTION,
  WEBSITE_AUDIT_PAGE_PATH,
  WEBSITE_AUDIT_PAGE_URL,
  WEBSITE_AUDIT_SUMMARY,
  WEBSITE_AUDIT_TITLE,
  WEBSITE_AUDIT_UPLOAD_DATE,
  WEBSITE_AUDIT_VIDEO_URL,
} from "@/lib/media";
import {
  DIGISOL_CITY,
  DIGISOL_PHONE,
  DIGISOL_POSTAL_CODE,
  DIGISOL_SITE_URL,
  DIGISOL_STREET_ADDRESS,
} from "@/lib/site";

export const metadata: Metadata = {
  title: "Website Audit for Alberta Businesses | DigiSol Media",
  description: WEBSITE_AUDIT_DESCRIPTION,
  alternates: {
    canonical: WEBSITE_AUDIT_PAGE_PATH,
  },
  openGraph: {
    title: WEBSITE_AUDIT_TITLE,
    description: WEBSITE_AUDIT_DESCRIPTION,
    url: WEBSITE_AUDIT_PAGE_URL,
    siteName: "DigiSol",
    locale: "en_CA",
    type: "video.other",
    videos: [
      {
        url: WEBSITE_AUDIT_VIDEO_URL,
        type: "video/mp4",
      },
    ],
    images: [
      {
        url: "/logo.jpg",
        alt: "DigiSol website audit presentation",
      },
    ],
  },
  twitter: {
    card: "player",
    title: WEBSITE_AUDIT_TITLE,
    description: WEBSITE_AUDIT_DESCRIPTION,
    images: ["/logo.jpg"],
  },
};

const videoJsonLd = {
  "@context": "https://schema.org",
  "@type": "VideoObject",
  name: WEBSITE_AUDIT_TITLE,
  description: WEBSITE_AUDIT_DESCRIPTION,
  thumbnailUrl: `${DIGISOL_SITE_URL}/logo.jpg`,
  uploadDate: WEBSITE_AUDIT_UPLOAD_DATE,
  contentUrl: WEBSITE_AUDIT_VIDEO_URL,
  embedUrl: WEBSITE_AUDIT_PAGE_URL,
  inLanguage: "en-CA",
  publisher: {
    "@type": "LocalBusiness",
    name: "DigiSol",
    url: DIGISOL_SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: `${DIGISOL_SITE_URL}/logo.jpg`,
    },
    telephone: DIGISOL_PHONE,
    address: {
      "@type": "PostalAddress",
      streetAddress: DIGISOL_STREET_ADDRESS,
      addressLocality: DIGISOL_CITY,
      addressRegion: "AB",
      postalCode: DIGISOL_POSTAL_CODE,
      addressCountry: "CA",
    },
  },
};

export default function WebsiteAuditMediaPage() {
  return (
    <>
      <Navbar />
      <main id="main" className="border-t border-white/10">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(videoJsonLd) }}
        />
        <article className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-indigo-400">
              DigiSol Media
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Website Audit for Alberta Businesses
            </h1>
            <p className="mt-4 text-lg text-zinc-400">{WEBSITE_AUDIT_DESCRIPTION}</p>

            <div className="mt-10">
              <WebsiteAuditVideo />
            </div>

            <div className="mt-10 space-y-4 text-zinc-300">
              <h2 className="text-xl font-semibold text-white">
                What this presentation covers
              </h2>
              <p>{WEBSITE_AUDIT_SUMMARY}</p>
              <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-zinc-400">
                <li>Design and messaging that make the next step obvious</li>
                <li>Mobile experience and page speed that protect local SEO</li>
                <li>Google Business Profile and Alberta search visibility</li>
                <li>Conversion paths from visit to booked consultation</li>
              </ul>
            </div>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
              <TrackedLink
                href="/#contact"
                eventName="cta_click"
                eventParams={{
                  cta_name: "book_consultation",
                  location: "media_website_audit",
                }}
                className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
              >
                Book a DigiSol consultation
              </TrackedLink>
              <a
                href={WEBSITE_AUDIT_VIDEO_URL}
                className="text-sm font-medium text-zinc-400 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
              >
                Direct video file (MP4)
              </a>
            </div>
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
