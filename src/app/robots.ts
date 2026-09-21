import type { MetadataRoute } from "next";
import { DIGISOL_SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/hub/", "/api/", "/auth/"],
    },
    sitemap: `${DIGISOL_SITE_URL}/sitemap.xml`,
    host: DIGISOL_SITE_URL,
  };
}
