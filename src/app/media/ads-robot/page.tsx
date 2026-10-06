import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { TrackedLink } from "@/components/TrackedLink";
import {
  ADS_ROBOT_DESCRIPTION,
  ADS_ROBOT_DURATION_ISO,
  ADS_ROBOT_PAGE_PATH,
  ADS_ROBOT_PAGE_URL,
  ADS_ROBOT_THUMBNAIL_URL,
  ADS_ROBOT_TITLE,
  ADS_ROBOT_UPLOAD_DATETIME,
  ADS_ROBOT_VIDEO_PATH,
  ADS_ROBOT_VIDEO_URL,
  MEDIA_INDEX_PATH,
} from "@/lib/media";
import { DIGISOL_X_CARD } from "@/lib/site";

export const metadata: Metadata = {
  title: "Ads robot — how DigiSol helps | DigiSol Media",
  description: ADS_ROBOT_DESCRIPTION,
  alternates: { canonical: ADS_ROBOT_PAGE_PATH },
  robots: { index: true, follow: true },
  openGraph: {
    title: ADS_ROBOT_TITLE,
    description: ADS_ROBOT_DESCRIPTION,
    url: ADS_ROBOT_PAGE_URL,
    siteName: "DigiSol",
    locale: "en_CA",
    type: "video.other",
    videos: [{ url: ADS_ROBOT_VIDEO_URL, type: "video/mp4" }],
  },
  twitter: {
    card: "summary_large_image",
    ...DIGISOL_X_CARD,
    title: ADS_ROBOT_TITLE,
    description: ADS_ROBOT_DESCRIPTION,
  },
};

const videoJsonLd = {
  "@context": "https://schema.org",
  "@type": "VideoObject",
  name: ADS_ROBOT_TITLE,
  description: ADS_ROBOT_DESCRIPTION,
  thumbnailUrl: ADS_ROBOT_THUMBNAIL_URL,
  uploadDate: ADS_ROBOT_UPLOAD_DATETIME,
  duration: ADS_ROBOT_DURATION_ISO,
  contentUrl: ADS_ROBOT_VIDEO_URL,
  embedUrl: ADS_ROBOT_PAGE_URL,
  inLanguage: "en-CA",
};

export default function AdsRobotMediaPage() {
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
              {ADS_ROBOT_TITLE}
            </h1>
            <p className="mt-4 text-lg text-zinc-300">{ADS_ROBOT_DESCRIPTION}</p>
            <video
              className="mt-10 aspect-video w-full rounded-xl border border-white/10 bg-black object-contain"
              controls
              playsInline
              preload="metadata"
              aria-label={ADS_ROBOT_TITLE}
            >
              <source src={ADS_ROBOT_VIDEO_PATH} type="video/mp4" />
              <a href={ADS_ROBOT_VIDEO_PATH}>Download the ads robot video</a>
            </video>
            <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <TrackedLink
                href="/#contact"
                eventName="cta_click"
                eventParams={{ cta_name: "book_consultation", location: "ads_robot_media" }}
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
