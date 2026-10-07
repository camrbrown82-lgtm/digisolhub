import {
  ADS_ROBOT_DESCRIPTION,
  GOOGLE_SETUP_DESCRIPTION,
  GOOGLE_SETUP_DURATION_SECONDS,
  GOOGLE_SETUP_PAGE_URL,
  GOOGLE_SETUP_THUMBNAIL_URL,
  GOOGLE_SETUP_TITLE,
  GOOGLE_SETUP_UPLOAD_DATETIME,
  GOOGLE_SETUP_VIDEO_URL,
  ADS_ROBOT_DURATION_SECONDS,
  ADS_ROBOT_PAGE_URL,
  ADS_ROBOT_THUMBNAIL_URL,
  ADS_ROBOT_TITLE,
  ADS_ROBOT_UPLOAD_DATETIME,
  ADS_ROBOT_VIDEO_URL,
  HUB_ANALYTICS_DESCRIPTION,
  HUB_ANALYTICS_DURATION_SECONDS,
  HUB_ANALYTICS_PAGE_URL,
  HUB_ANALYTICS_THUMBNAIL_URL,
  HUB_ANALYTICS_TITLE,
  HUB_ANALYTICS_UPLOAD_DATETIME,
  HUB_ANALYTICS_VIDEO_URL,
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
    page: GOOGLE_SETUP_PAGE_URL,
    thumbnail: GOOGLE_SETUP_THUMBNAIL_URL,
    title: GOOGLE_SETUP_TITLE,
    description: GOOGLE_SETUP_DESCRIPTION,
    content: GOOGLE_SETUP_VIDEO_URL,
    duration: GOOGLE_SETUP_DURATION_SECONDS,
    published: GOOGLE_SETUP_UPLOAD_DATETIME,
  },
  {
    page: ADS_ROBOT_PAGE_URL,
    thumbnail: ADS_ROBOT_THUMBNAIL_URL,
    title: ADS_ROBOT_TITLE,
    description: ADS_ROBOT_DESCRIPTION,
    content: ADS_ROBOT_VIDEO_URL,
    duration: ADS_ROBOT_DURATION_SECONDS,
    published: ADS_ROBOT_UPLOAD_DATETIME,
  },
  {
    page: WEBSITE_AUDIT_PAGE_URL,
    thumbnail: WEBSITE_AUDIT_THUMBNAIL_URL,
    title: WEBSITE_AUDIT_TITLE,
    description: WEBSITE_AUDIT_DESCRIPTION,
    content: WEBSITE_AUDIT_VIDEO_URL,
    duration: WEBSITE_AUDIT_DURATION_SECONDS,
    published: WEBSITE_AUDIT_UPLOAD_DATETIME,
  },
  {
    page: HUB_ANALYTICS_PAGE_URL,
    thumbnail: HUB_ANALYTICS_THUMBNAIL_URL,
    title: HUB_ANALYTICS_TITLE,
    description: HUB_ANALYTICS_DESCRIPTION,
    content: HUB_ANALYTICS_VIDEO_URL,
    duration: HUB_ANALYTICS_DURATION_SECONDS,
    published: HUB_ANALYTICS_UPLOAD_DATETIME,
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
