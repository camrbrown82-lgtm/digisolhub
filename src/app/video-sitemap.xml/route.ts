import {
  WEBSITE_AUDIT_DESCRIPTION,
  WEBSITE_AUDIT_DURATION_SECONDS,
  WEBSITE_AUDIT_PAGE_URL,
  WEBSITE_AUDIT_THUMBNAIL_URL,
  WEBSITE_AUDIT_TITLE,
  WEBSITE_AUDIT_UPLOAD_DATETIME,
  WEBSITE_AUDIT_VIDEO_URL,
} from "@/lib/media";
import { DIGISOL_SITE_URL } from "@/lib/site";

/** Next 14's sitemap.ts can't emit video tags, so the video sitemap is served here. */
export const dynamic = "force-static";

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const VIDEOS = [
  {
    page: WEBSITE_AUDIT_PAGE_URL,
    thumbnail: WEBSITE_AUDIT_THUMBNAIL_URL,
    title: WEBSITE_AUDIT_TITLE,
    description: WEBSITE_AUDIT_DESCRIPTION,
    content: WEBSITE_AUDIT_VIDEO_URL,
    duration: WEBSITE_AUDIT_DURATION_SECONDS,
    published: WEBSITE_AUDIT_UPLOAD_DATETIME,
  },
];

export function GET() {
  const entries = VIDEOS.map(
    (v) => `  <url>
    <loc>${escapeXml(v.page)}</loc>
    <video:video>
      <video:thumbnail_loc>${escapeXml(v.thumbnail)}</video:thumbnail_loc>
      <video:title>${escapeXml(v.title)}</video:title>
      <video:description>${escapeXml(v.description)}</video:description>
      <video:content_loc>${escapeXml(v.content)}</video:content_loc>
      <video:duration>${v.duration}</video:duration>
      <video:publication_date>${v.published}</video:publication_date>
      <video:family_friendly>yes</video:family_friendly>
      <video:uploader info="${escapeXml(DIGISOL_SITE_URL)}">DigiSol</video:uploader>
    </video:video>
  </url>`,
  ).join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
${entries}
</urlset>
`;
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
