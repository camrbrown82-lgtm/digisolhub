import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { TrackedLink } from "@/components/TrackedLink";
import { MEDIA_COLLECTION, MEDIA_INDEX_PATH } from "@/lib/media";
import { DIGISOL_SITE_URL, DIGISOL_X_CARD } from "@/lib/site";

const TITLE = "DigiSol Media";
const DESCRIPTION =
  "Watch how DigiSol helps. Hub walkthroughs and client work, collected in one place so you can see the work before you book.";

export const metadata: Metadata = {
  title: "Media | DigiSol",
  description: DESCRIPTION,
  alternates: { canonical: MEDIA_INDEX_PATH },
  robots: { index: true, follow: true },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${DIGISOL_SITE_URL}${MEDIA_INDEX_PATH}`,
    siteName: "DigiSol",
    locale: "en_CA",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    ...DIGISOL_X_CARD,
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function MediaCollectionPage() {
  return (
    <>
      <Navbar />
      <main id="main" className="border-t border-white/10">
        <div className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-indigo-400">
              DigiSol Media
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              See how DigiSol can help you
            </h1>
            <p className="mt-4 text-lg text-zinc-300">
              This is the collection. Each video shows the work we do for a client, starting with
              the Hub. More Hub page walkthroughs will be added here as they are recorded.
            </p>
            <div className="mt-14 space-y-16">
              {MEDIA_COLLECTION.map((item) => (
                <article key={item.href} id={item.href.split("/").pop()}>
                  <h2 className="text-xl font-semibold tracking-tight text-white">{item.title}</h2>
                  <p className="mt-3 text-zinc-400">{item.description}</p>
                  <video
                    className="mt-6 aspect-video w-full rounded-xl border border-white/10 bg-black object-contain"
                    controls
                    playsInline
                    preload="none"
                    poster={"poster" in item ? item.poster : undefined}
                    aria-label={item.label}
                  >
                    <source src={item.videoPath} type="video/mp4" />
                    <a href={item.videoPath}>Download {item.title}</a>
                  </video>
                  <p className="mt-4">
                    <a
                      href={item.href}
                      className="text-sm font-medium text-indigo-300 transition hover:text-sky-300"
                    >
                      Open this video
                    </a>
                  </p>
                </article>
              ))}
            </div>
            <div className="mt-16">
              <TrackedLink
                href="/#contact"
                eventName="cta_click"
                eventParams={{ cta_name: "book_consultation", location: "media_collection" }}
                className="inline-flex items-center rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
              >
                Book a consultation
              </TrackedLink>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
