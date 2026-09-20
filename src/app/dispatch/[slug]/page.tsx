import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { DispatchExport } from "@/components/DispatchExport";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { TrackedLink } from "@/components/TrackedLink";
import {
  DISPATCH_ISSUES,
  dispatchUrl,
  getDispatchIssue,
} from "@/lib/dispatch";
import { DIGISOL_FACEBOOK_URL, DIGISOL_LINKEDIN_URL, DIGISOL_SITE_URL } from "@/lib/site";

type PageProps = {
  params: { slug: string };
};

export function generateStaticParams() {
  return DISPATCH_ISSUES.map((issue) => ({ slug: issue.slug }));
}

export function generateMetadata({ params }: PageProps): Metadata {
  const issue = getDispatchIssue(params.slug);
  if (!issue) return {};
  const url = dispatchUrl(issue.slug);
  return {
    title: `${issue.title} | DigiSol Dispatch`,
    description: issue.excerpt,
    keywords: issue.keywords,
    alternates: {
      canonical: `/dispatch/${issue.slug}`,
    },
    openGraph: {
      title: issue.title,
      description: issue.excerpt,
      url,
      type: "article",
      locale: "en_CA",
      siteName: "DigiSol",
      publishedTime: issue.publishedAt,
      images: [{ url: "/logo.jpg", alt: "DigiSol Dispatch" }],
    },
    twitter: {
      card: "summary_large_image",
      title: issue.title,
      description: issue.excerpt,
      images: ["/logo.jpg"],
    },
  };
}

export default function DispatchIssuePage({ params }: PageProps) {
  const issue = getDispatchIssue(params.slug);
  if (!issue) notFound();

  const url = dispatchUrl(issue.slug);
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: issue.title,
    description: issue.excerpt,
    datePublished: issue.publishedAt,
    dateModified: issue.publishedAt,
    mainEntityOfPage: url,
    url,
    image: `${DIGISOL_SITE_URL}/logo.jpg`,
    keywords: issue.keywords.join(", "),
    inLanguage: "en-CA",
    author: {
      "@type": "Person",
      name: "Cameron Brown",
      jobTitle: "Founder & CEO",
      url: DIGISOL_LINKEDIN_URL,
      sameAs: [DIGISOL_LINKEDIN_URL],
    },
    publisher: {
      "@type": "Organization",
      name: "DigiSol",
      url: DIGISOL_SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${DIGISOL_SITE_URL}/logo.jpg`,
      },
      sameAs: [DIGISOL_FACEBOOK_URL, DIGISOL_LINKEDIN_URL],
    },
    about: [
      "Off-page SEO",
      "Local SEO in Alberta",
      "Airdrie web development",
    ],
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: ["h1", "article p"],
    },
  };

  return (
    <>
      <Navbar />
      <main id="main" className="px-4 py-16 sm:px-6 lg:px-8">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
        />
        <article className="mx-auto max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-400">
            DigiSol Dispatch · Volume {issue.volume}
          </p>
          <p className="mt-2 text-sm text-zinc-500">
            {issue.month} {issue.year} · {issue.readingMinutes} min read
          </p>
          <h1 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-white sm:text-5xl">
            {issue.title}
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-zinc-300">
            {issue.excerpt}
          </p>
          <div className="mt-8 space-y-10">
            {issue.sections.map((section) => (
              <section key={section.heading}>
                <h2 className="text-2xl font-semibold tracking-tight text-white">
                  {section.heading}
                </h2>
                {section.body.map((paragraph, index) => (
                  <p
                    key={`${section.heading}-${index}`}
                    className="mt-3 text-base leading-relaxed text-zinc-300"
                  >
                    {paragraph}
                  </p>
                ))}
              </section>
            ))}
          </div>
          <div className="mt-12 rounded-2xl border border-indigo-400/25 bg-indigo-500/10 p-6 text-center">
            <h2 className="text-xl font-semibold text-white">
              Ready to apply this in Alberta?
            </h2>
            <p className="mt-2 text-sm text-zinc-400">
              Book a free consultation for website design, Next.js engineering,
              and full-funnel CRO.
            </p>
            <TrackedLink
              href="/#contact"
              eventName="cta_click"
              eventParams={{
                cta_name: "book_consultation",
                location: "dispatch_issue",
              }}
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-500"
            >
              Book a Free Consultation
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </TrackedLink>
          </div>
          <div id="export" className="mt-8 scroll-mt-8">
            <DispatchExport issue={issue} />
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
