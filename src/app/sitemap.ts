import type { MetadataRoute } from "next";
import { blogUrl, publishedBlogPosts } from "@/lib/blog";
import { DISPATCH_ISSUES, dispatchUrl } from "@/lib/dispatch";
import { LOCALES, LOCALE_META, localizePath } from "@/lib/i18n/config";
import { LOCATION_PAGES } from "@/lib/locations";
import { DIGISOL_SITE_URL } from "@/lib/site";

type Entry = MetadataRoute.Sitemap[number];

const absolute = (path: string) => (path === "/" ? DIGISOL_SITE_URL : `${DIGISOL_SITE_URL}${path}`);

/** One entry per language for a translated page, each listing every language as an alternate. */
function translated(path: string, entry: Omit<Entry, "url" | "alternates">): Entry[] {
  const languages = Object.fromEntries(
    LOCALES.map((locale) => [LOCALE_META[locale].hreflang, absolute(localizePath(path, locale))]),
  );
  return LOCALES.map((locale) => ({
    ...entry,
    url: absolute(localizePath(path, locale)),
    alternates: { languages },
  }));
}

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    ...translated("/", { lastModified: now, changeFrequency: "weekly", priority: 1 }),
    ...translated("/locations/airdrie", { lastModified: now, changeFrequency: "weekly", priority: 0.98 }),
    ...translated("/locations", { lastModified: now, changeFrequency: "weekly", priority: 0.9 }),
    ...translated("/pricing", { lastModified: now, changeFrequency: "weekly", priority: 0.9 }),
    ...translated("/about", { lastModified: now, changeFrequency: "monthly", priority: 0.8 }),
    {
      url: `${DIGISOL_SITE_URL}/privacy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${DIGISOL_SITE_URL}/dispatch`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${DIGISOL_SITE_URL}/media`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${DIGISOL_SITE_URL}/media/website-audit`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.75,
    },
    {
      url: `${DIGISOL_SITE_URL}/media/google-setup`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.75,
    },
    {
      url: `${DIGISOL_SITE_URL}/media/ads-robot`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.75,
    },
    {
      url: `${DIGISOL_SITE_URL}/media/hub-analytics`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.75,
    },
    {
      url: `${DIGISOL_SITE_URL}/media/dealfinder`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    ...LOCATION_PAGES.filter((page) => page.slug !== "airdrie").flatMap((page) =>
      translated(`/locations/${page.slug}`, {
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.85,
      }),
    ),
    {
      url: `${DIGISOL_SITE_URL}/blog`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...publishedBlogPosts().map((post) => ({
      url: blogUrl(post.slug),
      lastModified: new Date(post.updatedAt ?? post.publishedAt),
      changeFrequency: "monthly" as const,
      priority: 0.75,
    })),
    ...DISPATCH_ISSUES.map((issue) => ({
      url: dispatchUrl(issue.slug),
      lastModified: new Date(issue.publishedAt),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
