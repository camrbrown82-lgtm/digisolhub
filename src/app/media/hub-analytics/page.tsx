import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { HubAnalyticsVideo } from "@/components/HubAnalyticsVideo";
import { Navbar } from "@/components/Navbar";
import { TrackedLink } from "@/components/TrackedLink";
import {
  HUB_ANALYTICS_DESCRIPTION,
  HUB_ANALYTICS_DURATION_ISO,
  HUB_ANALYTICS_PAGE_PATH,
  HUB_ANALYTICS_PAGE_URL,
  HUB_ANALYTICS_THUMBNAIL_URL,
  HUB_ANALYTICS_TITLE,
  HUB_ANALYTICS_UPLOAD_DATETIME,
  HUB_ANALYTICS_VIDEO_PATH,
  HUB_ANALYTICS_VIDEO_URL,
  MEDIA_INDEX_PATH,
} from "@/lib/media";
import { DIGISOL_X_CARD } from "@/lib/site";

export const metadata: Metadata = {
  title: "Hub analytics — how DigiSol helps | DigiSol Media",
  description: HUB_ANALYTICS_DESCRIPTION,
  alternates: { canonical: HUB_ANALYTICS_PAGE_PATH },
  robots: { index: true, follow: true },
  openGraph: {
    title: HUB_ANALYTICS_TITLE,
    description: HUB_ANALYTICS_DESCRIPTION,
    url: HUB_ANALYTICS_PAGE_URL,
    siteName: "DigiSol",
    locale: "en_CA",
    type: "video.other",
    videos: [{ url: HUB_ANALYTICS_VIDEO_URL, type: "video/mp4" }],
  },
  twitter: {
    card: "summary_large_image",
    ...DIGISOL_X_CARD,
    title: HUB_ANALYTICS_TITLE,
    description: HUB_ANALYTICS_DESCRIPTION,
  },
};

const videoJsonLd = {
  "@context": "https://schema.org",
  "@type": "VideoObject",
  name: HUB_ANALYTICS_TITLE,
  description: HUB_ANALYTICS_DESCRIPTION,
  thumbnailUrl: HUB_ANALYTICS_THUMBNAIL_URL,
  uploadDate: HUB_ANALYTICS_UPLOAD_DATETIME,
  duration: HUB_ANALYTICS_DURATION_ISO,
  contentUrl: HUB_ANALYTICS_VIDEO_URL,
  embedUrl: HUB_ANALYTICS_PAGE_URL,
  inLanguage: "en-CA",
};

export default function HubAnalyticsMediaPage() {
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
              {HUB_ANALYTICS_TITLE}
            </h1>
            <p className="mt-4 text-lg text-zinc-300">
              This is how we help you. The video walks through the analytics page in DigiSol Hub,
              the same view we use with a client: which visits turn into leads, where they come
              from, and what to follow up on next.
            </p>
            <p className="mt-3 text-zinc-400">
              More Hub walkthroughs will be added here as we record each page, so you can watch
              the work before you book.
            </p>
            <HubAnalyticsVideo className="mt-10" />
            <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <TrackedLink
                href="/#contact"
                eventName="cta_click"
                eventParams={{
                  cta_name: "book_consultation",
                  location: "hub_analytics_media",
                }}
                className="inline-flex items-center rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
              >
                Book a consultation
              </TrackedLink>
              <a
                href={HUB_ANALYTICS_VIDEO_PATH}
                className="text-sm font-medium text-indigo-300 transition hover:text-sky-300"
              >
                Direct video file (MP4)
              </a>
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
