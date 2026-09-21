import type { MetadataRoute } from "next";
import { DISPATCH_ISSUES, dispatchUrl } from "@/lib/dispatch";
import { LOCATION_PAGES, locationUrl } from "@/lib/locations";
import { DIGISOL_SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: DIGISOL_SITE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${DIGISOL_SITE_URL}/dispatch`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${DIGISOL_SITE_URL}/locations`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.85,
    },
    {
      url: `${DIGISOL_SITE_URL}/pricing`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${DIGISOL_SITE_URL}/media/website-audit`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.75,
    },
    ...LOCATION_PAGES.map((page) => ({
      url: locationUrl(page.slug),
      lastModified: new Date(),
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
