import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { TrackedLink } from "@/components/TrackedLink";
import {
  GOOGLE_SETUP_DESCRIPTION,
  GOOGLE_SETUP_DURATION_ISO,
  GOOGLE_SETUP_PAGE_PATH,
  GOOGLE_SETUP_PAGE_URL,
  GOOGLE_SETUP_THUMBNAIL_URL,
  GOOGLE_SETUP_TITLE,
  GOOGLE_SETUP_UPLOAD_DATETIME,
  GOOGLE_SETUP_VIDEO_PATH,
  GOOGLE_SETUP_VIDEO_URL,
  MEDIA_INDEX_PATH,
} from "@/lib/media";
import { DIGISOL_X_CARD } from "@/lib/site";

export const metadata: Metadata = {
  title: "Google setup — how DigiSol helps | DigiSol Media",
  description: GOOGLE_SETUP_DESCRIPTION,
  alternates: { canonical: GOOGLE_SETUP_PAGE_PATH },
  robots: { index: true, follow: true },
  openGraph: {
    title: GOOGLE_SETUP_TITLE,
    description: GOOGLE_SETUP_DESCRIPTION,
    url: GOOGLE_SETUP_PAGE_URL,
    siteName: "DigiSol",
    locale: "en_CA",
    type: "video.other",
    videos: [{ url: GOOGLE_SETUP_VIDEO_URL, type: "video/mp4" }],
  },
  twitter: {
    card: "summary_large_image",
    ...DIGISOL_X_CARD,
    title: GOOGLE_SETUP_TITLE,
    description: GOOGLE_SETUP_DESCRIPTION,
  },
};

const videoJsonLd = {
  "@context": "https://schema.org",
  "@type": "VideoObject",
  name: GOOGLE_SETUP_TITLE,
  description: GOOGLE_SETUP_DESCRIPTION,
  thumbnailUrl: GOOGLE_SETUP_THUMBNAIL_URL,
  uploadDate: GOOGLE_SETUP_UPLOAD_DATETIME,
  duration: GOOGLE_SETUP_DURATION_ISO,
  contentUrl: GOOGLE_SETUP_VIDEO_URL,
  embedUrl: GOOGLE_SETUP_PAGE_URL,
  inLanguage: "en-CA",
};

export default function GoogleSetupMediaPage() {
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
              {GOOGLE_SETUP_TITLE}
            </h1>
            <p className="mt-4 text-lg text-zinc-300">{GOOGLE_SETUP_DESCRIPTION}</p>
            <video
              className="mt-10 aspect-video w-full rounded-xl border border-white/10 bg-black object-contain"
              controls
              playsInline
              preload="metadata"
              aria-label={GOOGLE_SETUP_TITLE}
            >
              <source src={GOOGLE_SETUP_VIDEO_PATH} type="video/mp4" />
              <a href={GOOGLE_SETUP_VIDEO_PATH}>Download the Google setup video</a>
            </video>
            <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <TrackedLink
                href="/#contact"
                eventName="cta_click"
                eventParams={{ cta_name: "book_consultation", location: "google_setup_media" }}
                className="inline-flex items-center rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
              >
                Book a consultation
              </TrackedLink>
              <a
                href={MEDIA_INDEX_PATH}
                className="text-sm font-medium text-indigo-300 transition hover:text-sky-300"
              >
                All videos
              </a>
            </div>
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
