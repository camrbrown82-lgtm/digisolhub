import type { MetadataRoute } from "next";
import { DISPATCH_ISSUES, dispatchUrl } from "@/lib/dispatch";
import { LOCATION_PAGES, locationUrl } from "@/lib/locations";
import { DIGISOL_SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    {
      url: DIGISOL_SITE_URL,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${DIGISOL_SITE_URL}/locations/airdrie`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.98,
    },
    {
      url: `${DIGISOL_SITE_URL}/locations`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${DIGISOL_SITE_URL}/pricing`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${DIGISOL_SITE_URL}/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
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
      url: `${DIGISOL_SITE_URL}/media/website-audit`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.75,
    },
    ...LOCATION_PAGES.filter((page) => page.slug !== "airdrie").map((page) => ({
      url: locationUrl(page.slug),
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.85,
    })),
    ...DISPATCH_ISSUES.map((issue) => ({
      url: dispatchUrl(issue.slug),
      lastModified: new Date(issue.publishedAt),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
