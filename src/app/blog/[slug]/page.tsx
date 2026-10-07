import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { ContactOptions } from "@/components/ContactOptions";
import {
  DispatchEyebrow,
  DispatchSectionHeading,
  DispatchTitle,
} from "@/components/DispatchHeadings";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { QuickQuote } from "@/components/QuickQuote";
import { ShareButtons } from "@/components/ShareButtons";
import { BLOG_POSTS, blogPath, blogUrl, getBlogPost, publishedBlogPosts } from "@/lib/blog";
import {
  DIGISOL_FOUNDER,
  DIGISOL_FOUNDER_TITLE,
  DIGISOL_LINKEDIN_URL,
  DIGISOL_SAME_AS,
  DIGISOL_SITE_URL,
  DIGISOL_X_CARD,
} from "@/lib/site";

type PageProps = { params: { slug: string } };

export function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export function generateMetadata({ params }: PageProps): Metadata {
  const post = getBlogPost(params.slug);
  if (!post) return {};
  const card = `${blogPath(post.slug)}/card.jpg`;
  return {
    title: `${post.title} | DigiSol Guides`,
    description: post.excerpt,
    keywords: post.keywords,
    alternates: { canonical: blogPath(post.slug) },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url: blogUrl(post.slug),
      type: "article",
      locale: "en_CA",
      siteName: "DigiSol",
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt ?? post.publishedAt,
      images: [{ url: card, width: 1200, height: 630, alt: post.title }],
    },
    twitter: {
      card: "summary_large_image",
      ...DIGISOL_X_CARD,
      title: post.title,
      description: post.excerpt,
      images: [card],
    },
  };
}

function isExternal(href: string) {
  return /^https?:\/\//.test(href);
}

export default function BlogPostPage({ params }: PageProps) {
  const post = getBlogPost(params.slug);
  if (!post) notFound();

  const url = blogUrl(post.slug);
  const related = publishedBlogPosts().filter((p) => p.slug !== post.slug).slice(0, 2);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt ?? post.publishedAt,
    mainEntityOfPage: url,
    url,
    image: `${url}/card.jpg`,
    keywords: post.keywords.join(", "),
    articleSection: post.category,
    inLanguage: "en-CA",
    author: {
      "@type": "Person",
      name: DIGISOL_FOUNDER,
      jobTitle: DIGISOL_FOUNDER_TITLE,
      url: DIGISOL_LINKEDIN_URL || `${DIGISOL_SITE_URL}/about`,
    },
    publisher: {
      "@type": "Organization",
      name: "DigiSol",
      url: DIGISOL_SITE_URL,
      logo: { "@type": "ImageObject", url: `${DIGISOL_SITE_URL}/logo-badge.png` },
      sameAs: [...DIGISOL_SAME_AS],
    },
  };

  return (
    <>
      <Navbar />
      <main id="main" className="px-4 py-16 sm:px-6 lg:px-8">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <article className="mx-auto max-w-3xl">
          <p className="text-sm text-zinc-500">
            <a href="/blog" className="hover:text-zinc-300">
              Guides
            </a>{" "}
            / {post.category}
          </p>
          <div className="mt-3">
            <DispatchEyebrow>DigiSol Guides · {post.category}</DispatchEyebrow>
          </div>
          <DispatchTitle as="h1" className="mt-4">
            {post.title}
          </DispatchTitle>
          <p className="mt-3 text-sm text-zinc-500">
            By {DIGISOL_FOUNDER}, {DIGISOL_FOUNDER_TITLE} ·{" "}
            {new Date(`${post.publishedAt}T12:00:00`).toLocaleDateString("en-CA", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}{" "}
            · {post.readingMinutes} min read
          </p>
          <p className="mt-5 text-lg leading-relaxed text-zinc-300">{post.excerpt}</p>

          <div className="mt-10 space-y-12">
            {post.sections.map((section, index) => (
              <section key={section.heading}>
                <DispatchSectionHeading index={index}>{section.heading}</DispatchSectionHeading>
                {section.body.map((paragraph, i) => (
                  <p key={i} className="mt-4 text-base leading-relaxed text-zinc-300">
                    {paragraph}
                  </p>
                ))}
                {section.bullets?.length ? (
                  <ul className="mt-4 space-y-2.5">
                    {section.bullets.map((item) => (
                      <li key={item} className="flex gap-3 text-base leading-relaxed text-zinc-300">
                        <span
                          className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400"
                          aria-hidden="true"
                        />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {section.after?.map((paragraph, i) => (
                  <p key={`after-${i}`} className="mt-4 text-base leading-relaxed text-zinc-300">
                    {paragraph}
                  </p>
                ))}
                {section.links?.length ? (
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {section.links.map((link) => (
                      <li key={link.href}>
                        <a
                          href={link.href}
                          className="inline-flex items-center gap-1 rounded-full border border-indigo-400/30 px-3 py-1 text-sm text-indigo-200 hover:bg-indigo-500/10"
                        >
                          {link.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}
          </div>

          <ShareButtons
            className="mt-12"
            url={url}
            caption={`${post.title}\n\n${post.excerpt}\n\nRead the guide: ${url}`}
            analyticsKey={`blog_${post.slug}`}
            heading="Share this guide"
          />

          {post.furtherReading.length ? (
            <aside className="mt-12 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
                Further reading from official sources
              </h2>
              <ul className="mt-3 space-y-2">
                {post.furtherReading.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      target={isExternal(link.href) ? "_blank" : undefined}
                      rel={isExternal(link.href) ? "noopener" : undefined}
                      className="inline-flex items-center gap-1 text-sm text-indigo-300 hover:text-indigo-200"
                    >
                      {link.label}
                      <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </a>
                  </li>
                ))}
              </ul>
            </aside>
          ) : null}

          <div className="mt-12">
            <QuickQuote
              location={`blog_${post.slug}`}
              heading="Want DigiSol to handle this for you?"
              sub="Tell us the basics and get a clear, no-obligation quote."
            />
            <ContactOptions location="blog" className="mt-4" />
          </div>

          {related.length ? (
            <nav className="mt-12" aria-label="More guides">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
                More guides
              </h2>
              <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                {related.map((p) => (
                  <li key={p.slug}>
                    <a
                      href={blogPath(p.slug)}
                      className="block rounded-xl border border-white/10 p-4 transition hover:border-indigo-400/40"
                    >
                      <span className="text-xs text-indigo-300">{p.category}</span>
                      <span className="mt-1 block font-medium text-white">{p.title}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
        </article>
      </main>
      <Footer />
    </>
  );
}
