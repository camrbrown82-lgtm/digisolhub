import type { MetadataRoute } from "next";
import { DISPATCH_ISSUES, dispatchUrl } from "@/lib/dispatch";
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
    ...DISPATCH_ISSUES.map((issue) => ({
      url: dispatchUrl(issue.slug),
      lastModified: new Date(issue.publishedAt),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
