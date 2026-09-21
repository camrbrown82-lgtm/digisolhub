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
      ],
    },
    sitemap: `${DIGISOL_SITE_URL}/sitemap.xml`,
    host: "wwwdigisol.com",
  };
}
