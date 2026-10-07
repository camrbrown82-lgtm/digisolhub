import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { DIGISOL_SITE_URL, DIGISOL_X_CARD } from "@/lib/site";

const PAGE_PATH = "/media/dealfinder";
const PAGE_URL = `${DIGISOL_SITE_URL}${PAGE_PATH}`;
const VIDEO_PATH = "/media/dealfinder-auctions.mp4";
const VIDEO_URL = `${DIGISOL_SITE_URL}${VIDEO_PATH}`;
const TITLE = "DealFinder Auctions — a look at the website";
const DESCRIPTION =
  "A look at the DealFinder Auctions website DigiSol is building. The site is in beta, with live testing before the full launch.";

export const metadata: Metadata = {
  title: "DealFinder Auctions website | DigiSol Media",
  description: DESCRIPTION,
  alternates: { canonical: PAGE_PATH },
  robots: { index: true, follow: true },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: PAGE_URL,
    siteName: "DigiSol",
    locale: "en_CA",
    type: "video.other",
    videos: [{ url: VIDEO_URL, type: "video/mp4" }],
  },
  twitter: {
    card: "summary_large_image",
    ...DIGISOL_X_CARD,
    title: TITLE,
    description: DESCRIPTION,
  },
};

const videoJsonLd = {
  "@context": "https://schema.org",
  "@type": "VideoObject",
  name: TITLE,
  description: DESCRIPTION,
  uploadDate: "2026-10-03T00:00:00-06:00",
  contentUrl: VIDEO_URL,
  embedUrl: PAGE_URL,
  inLanguage: "en-CA",
};

export default function DealFinderMediaPage() {
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
            <p className="text-sm font-semibold uppercase tracking-wider text-indigo-400">DigiSol Media</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{TITLE}</h1>
            <p className="mt-4 text-lg text-zinc-400">{DESCRIPTION}</p>
            <video
              className="mt-10 aspect-video w-full rounded-xl border border-white/10 bg-black object-contain"
              controls
              playsInline
              preload="metadata"
              aria-label={TITLE}
            >
              <source src={VIDEO_PATH} type="video/mp4" />
              <a href={VIDEO_PATH}>Download the DealFinder video</a>
            </video>
            <p className="mt-6">
              <a
                href={VIDEO_URL}
                className="text-sm font-medium text-indigo-300 transition hover:text-sky-300"
              >
                Direct video file (MP4)
              </a>
            </p>
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
