import type { MetadataRoute } from "next";
import { DIGISOL_SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/confirmation",
        "/hub",
        "/hub/",
        "/auth/",
        "/unsubscribe",
        "/api/",
        "/poster-export",
      ],
    },
    sitemap: [`${DIGISOL_SITE_URL}/sitemap.xml`, `${DIGISOL_SITE_URL}/video-sitemap.xml`],
    host: "wwwdigisol.com",
  };
}
