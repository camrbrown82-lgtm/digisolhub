import { ArrowRight, BookOpen } from "lucide-react";
import { BrandCard } from "@/components/BrandCard";
import { DispatchEyebrow, DispatchTitle } from "@/components/DispatchHeadings";
import { TrackedLink } from "@/components/TrackedLink";
import { blogPath, publishedBlogPosts } from "@/lib/blog";
import { getServerMessages } from "@/lib/i18n/server";

/** Latest guides for local business owners; `limit` of 0 shows every post. */
export function BlogHighlights({
  limit = 3,
  headingLevel = "h2",
  location = "home",
}: {
  limit?: number;
  headingLevel?: "h1" | "h2";
  location?: string;
}) {
  const posts = publishedBlogPosts();
  const shown = limit > 0 ? posts.slice(0, limit) : posts;
  if (shown.length === 0) return null;
  const t = getServerMessages().blogHighlights;

  return (
    <section
      id="guides"
      className="border-t border-white/10 px-4 py-20 sm:px-6 lg:px-8"
      aria-labelledby="guides-heading"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <DispatchEyebrow>{t.eyebrow}</DispatchEyebrow>
          <DispatchTitle as={headingLevel} id="guides-heading" className="mt-3">
            {t.title}
          </DispatchTitle>
          <p className="mt-4 text-zinc-400">{t.intro}</p>
        </div>
        <ul className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {shown.map((post, index) => (
            <li key={post.slug} className="flex">
              <BrandCard
                as="div"
                accent={index % 2 === 0 ? "indigo" : "blue"}
                className="w-full"
                innerClassName="p-6"
              >
                <article className="flex flex-col">
                  <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-300">
                    <BookOpen className="h-4 w-4" aria-hidden="true" />
                    {post.category} · {t.minRead(post.readingMinutes)}
                  </p>
                  <h3 className="mt-3 text-xl font-semibold tracking-tight text-white">
                    <a href={blogPath(post.slug)} className="hover:text-indigo-200">
                      {post.title}
                    </a>
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-zinc-300">{post.excerpt}</p>
                  <TrackedLink
                    href={blogPath(post.slug)}
                    eventName="blog_click"
                    eventParams={{ slug: post.slug, location }}
                    className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-indigo-300 hover:text-indigo-200"
                  >
                    {t.readGuide}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </TrackedLink>
                </article>
              </BrandCard>
            </li>
          ))}
        </ul>
        {limit > 0 && posts.length > limit ? (
          <div className="mt-10 text-center">
            <a href="/blog" className="text-sm font-semibold text-indigo-300 hover:text-indigo-200">
              {t.seeAll}
            </a>
          </div>
        ) : null}
      </div>
    </section>
  );
}
