import {
  DIGISOL_INSTAGRAM_HANDLE,
  DIGISOL_INSTAGRAM_URL,
  DIGISOL_SITE_URL,
  DIGISOL_TIKTOK_URL,
  DIGISOL_X_HANDLE,
  DIGISOL_X_URL,
  DIGISOL_YOUTUBE_URL,
  LINKEDIN_ENABLED,
} from "@/lib/site";

/** Stable public path for the DigiSol website-audit presentation (emails / Hub / GBP). */
export const WEBSITE_AUDIT_VIDEO_PATH = "/media/digisol-website-audit.mp4";
export const WEBSITE_AUDIT_PAGE_PATH = "/media/website-audit";

export const WEBSITE_AUDIT_VIDEO_URL = `${DIGISOL_SITE_URL}${WEBSITE_AUDIT_VIDEO_PATH}`;
export const WEBSITE_AUDIT_PAGE_URL = `${DIGISOL_SITE_URL}${WEBSITE_AUDIT_PAGE_PATH}`;

export const WEBSITE_AUDIT_UPLOAD_DATE = "2026-09-21";
/** Google rejects date-only uploadDate values; it needs a time and timezone. */
export const WEBSITE_AUDIT_UPLOAD_DATETIME = `${WEBSITE_AUDIT_UPLOAD_DATE}T00:00:00-06:00`;

/** Frame from 0:20 of the video (1920×1080). */
export const WEBSITE_AUDIT_THUMBNAIL_PATH = "/media/website-audit-thumbnail.jpg";
export const WEBSITE_AUDIT_THUMBNAIL_URL = `${DIGISOL_SITE_URL}${WEBSITE_AUDIT_THUMBNAIL_PATH}`;
export const WEBSITE_AUDIT_DURATION_SECONDS = 192;
export const WEBSITE_AUDIT_DURATION_ISO = "PT3M12S";

/** Hub analytics walkthrough — how DigiSol reads a client's numbers with them. */
export const HUB_ANALYTICS_TITLE = "How DigiSol Hub analytics helps your business";
export const HUB_ANALYTICS_DESCRIPTION =
  "A walkthrough of the DigiSol Hub analytics page. See how we help you read visits, leads, and what to follow up on next.";
export const HUB_ANALYTICS_PAGE_PATH = "/media/hub-analytics";
export const HUB_ANALYTICS_VIDEO_PATH = "/media/hub-analytics.mp4";
export const HUB_ANALYTICS_THUMBNAIL_URL = `${DIGISOL_SITE_URL}/og.jpg?page=video`;
export const HUB_ANALYTICS_DURATION_ISO = "PT6M9S";
export const HUB_ANALYTICS_DURATION_SECONDS = 369;
export const HUB_ANALYTICS_UPLOAD_DATE = "2026-10-05";
export const HUB_ANALYTICS_UPLOAD_DATETIME = `${HUB_ANALYTICS_UPLOAD_DATE}T00:00:00-06:00`;

export const HUB_ANALYTICS_PAGE_URL = `${DIGISOL_SITE_URL}${HUB_ANALYTICS_PAGE_PATH}`;
export const HUB_ANALYTICS_VIDEO_URL = `${DIGISOL_SITE_URL}${HUB_ANALYTICS_VIDEO_PATH}`;

export const DEALFINDER_TITLE = "DealFinder Auctions — a look at the website";
export const DEALFINDER_DESCRIPTION =
  "A look at the DealFinder Auctions website DigiSol is building. The site is in beta, with live testing before the full launch.";
export const DEALFINDER_PAGE_PATH = "/media/dealfinder";
export const DEALFINDER_VIDEO_PATH = "/media/dealfinder-auctions.mp4";

/** Ads robot walkthrough — how a brief becomes a campaign the client reviews. */
export const ADS_ROBOT_TITLE = "Watch the ads robot write your campaign";
export const ADS_ROBOT_DESCRIPTION =
  "This is how we help you run ads. Press play and watch the robot turn a short brief into a Facebook and Instagram campaign you review before anything goes live.";
export const ADS_ROBOT_PAGE_PATH = "/media/ads-robot";
export const ADS_ROBOT_VIDEO_PATH = "/media/ads-robot.mp4";
export const ADS_ROBOT_THUMBNAIL_URL = `${DIGISOL_SITE_URL}/og.jpg?page=video`;
export const ADS_ROBOT_DURATION_ISO = "PT2M25S";
export const ADS_ROBOT_DURATION_SECONDS = 145;
export const ADS_ROBOT_UPLOAD_DATE = "2026-10-05";
export const ADS_ROBOT_UPLOAD_DATETIME = `${ADS_ROBOT_UPLOAD_DATE}T00:00:00-06:00`;
export const ADS_ROBOT_PAGE_URL = `${DIGISOL_SITE_URL}${ADS_ROBOT_PAGE_PATH}`;
export const ADS_ROBOT_VIDEO_URL = `${DIGISOL_SITE_URL}${ADS_ROBOT_VIDEO_PATH}`;

/** Google setup walkthrough — how DigiSol connects Analytics, Search Console, and Ads. */
export const GOOGLE_SETUP_TITLE = "Watch how DigiSol sets up Google for you";
export const GOOGLE_SETUP_DESCRIPTION =
  "This is how we help you connect Google Analytics, Search Console, and Google Ads. Press play and see the Hub check the setup, the score, and what to fix before anything is left hanging.";
export const GOOGLE_SETUP_PAGE_PATH = "/media/google-setup";
export const GOOGLE_SETUP_VIDEO_PATH = "/media/google-setup.mp4";
export const GOOGLE_SETUP_THUMBNAIL_URL = `${DIGISOL_SITE_URL}/og.jpg?page=video`;
export const GOOGLE_SETUP_DURATION_ISO = "PT2M54S";
export const GOOGLE_SETUP_DURATION_SECONDS = 174;
export const GOOGLE_SETUP_UPLOAD_DATE = "2026-10-06";
export const GOOGLE_SETUP_UPLOAD_DATETIME = `${GOOGLE_SETUP_UPLOAD_DATE}T00:00:00-06:00`;
export const GOOGLE_SETUP_PAGE_URL = `${DIGISOL_SITE_URL}${GOOGLE_SETUP_PAGE_PATH}`;
export const GOOGLE_SETUP_VIDEO_URL = `${DIGISOL_SITE_URL}${GOOGLE_SETUP_VIDEO_PATH}`;

export const WEBSITE_AUDIT_TITLE =
  "DigiSol Website Audit — How Alberta Businesses Win Online";
export const WEBSITE_AUDIT_DESCRIPTION =
  "A DigiSol presentation on website audits for Alberta businesses: what we look for in design, speed, local SEO, and conversion paths — and how a clear audit turns into more booked work in Airdrie, Calgary, Edmonton, and across Alberta.";

/** Collection page for every public DigiSol video. Home only links here. */
export const MEDIA_INDEX_PATH = "/media";

export const MEDIA_COLLECTION = [
  {
    href: GOOGLE_SETUP_PAGE_PATH,
    title: GOOGLE_SETUP_TITLE,
    description: GOOGLE_SETUP_DESCRIPTION,
    videoPath: GOOGLE_SETUP_VIDEO_PATH,
    label: GOOGLE_SETUP_TITLE,
  },
  {
    href: ADS_ROBOT_PAGE_PATH,
    title: ADS_ROBOT_TITLE,
    description: ADS_ROBOT_DESCRIPTION,
    videoPath: ADS_ROBOT_VIDEO_PATH,
    label: ADS_ROBOT_TITLE,
  },
  {
    href: HUB_ANALYTICS_PAGE_PATH,
    title: HUB_ANALYTICS_TITLE,
    description: HUB_ANALYTICS_DESCRIPTION,
    videoPath: HUB_ANALYTICS_VIDEO_PATH,
    label: HUB_ANALYTICS_TITLE,
  },
  {
    href: WEBSITE_AUDIT_PAGE_PATH,
    title: WEBSITE_AUDIT_TITLE,
    description: WEBSITE_AUDIT_DESCRIPTION,
    videoPath: WEBSITE_AUDIT_VIDEO_PATH,
    poster: WEBSITE_AUDIT_THUMBNAIL_PATH,
    label: WEBSITE_AUDIT_TITLE,
  },
  {
    href: DEALFINDER_PAGE_PATH,
    title: DEALFINDER_TITLE,
    description: DEALFINDER_DESCRIPTION,
    videoPath: DEALFINDER_VIDEO_PATH,
    label: DEALFINDER_TITLE,
  },
] as const;

function publicMediaPath(url: string) {
  try {
    const parsed = new URL(url, DIGISOL_SITE_URL);
    const site = new URL(DIGISOL_SITE_URL);
    if (parsed.origin !== site.origin) return "";
    return parsed.pathname;
  } catch {
    return "";
  }
}

/** Public media videos, ready to pick in DigiSol social video posting. */
export function mediaLibraryVideos() {
  return MEDIA_COLLECTION.map((item) => ({
    url: item.videoPath,
    label: item.title,
    kind: "video" as const,
    source: "media" as const,
  }));
}

/** True only for a video already listed on the public media pages. */
export function isPublicMediaVideoUrl(url: string | null | undefined) {
  if (!url) return false;
  const path = publicMediaPath(url);
  return MEDIA_COLLECTION.some((item) => item.videoPath === path);
}

/** Absolute address Meta can fetch. Relative Hub picks stay on this site. */
export function absolutePublicMediaUrl(url: string) {
  const path = publicMediaPath(url);
  if (!MEDIA_COLLECTION.some((item) => item.videoPath === path)) return "";
  return `${DIGISOL_SITE_URL}${path}`;
}

export const WEBSITE_AUDIT_SUMMARY =
  "In this DigiSol website audit presentation, Cameron Brown walks through how Alberta companies can evaluate their site for clarity, mobile experience, local search visibility, and lead conversion. The audit covers design and messaging, technical performance, Google Business Profile alignment, and the next steps DigiSol takes to turn findings into a site that books work.";

export function websiteAuditSocialPack() {
  const url = WEBSITE_AUDIT_PAGE_URL;
  const videoUrl = WEBSITE_AUDIT_VIDEO_URL;
  const hashtags = [
    "#DigiSol",
    "#WebsiteAudit",
    "#AlbertaBusiness",
    "#LocalSEO",
    "#Airdrie",
    "#Calgary",
    "#Edmonton",
    "#RedDeer",
    "#WebDesign",
    "#DigitalMarketing",
  ];

  const facebook = [
    WEBSITE_AUDIT_TITLE,
    "",
    "What should Alberta businesses fix first on their website?",
    "Design clarity, mobile speed, local SEO, and a path from visit to booked work.",
    "",
    `Watch the DigiSol presentation: ${url}`,
    `Direct video: ${videoUrl}`,
    `Book a consult: ${DIGISOL_SITE_URL}/#contact`,
    "",
    hashtags.join(" "),
  ].join("\n");

  const linkedin = [
    WEBSITE_AUDIT_TITLE,
    "",
    WEBSITE_AUDIT_DESCRIPTION,
    "",
    "Use this short DigiSol audit walkthrough with your team — then decide what to fix before you spend more on ads.",
    "",
    `Full media page: ${url}`,
    `MP4: ${videoUrl}`,
    `Work with DigiSol: ${DIGISOL_SITE_URL}/#contact`,
  ].join("\n");

  const instagram = [
    "Website audit checklist for Alberta businesses",
    "",
    "Design · speed · local SEO · conversion paths",
    "",
    "Watch on wwwdigisol.com → link in bio",
    `Follow @${DIGISOL_INSTAGRAM_HANDLE}`,
    DIGISOL_INSTAGRAM_URL,
    "",
    hashtags.join(" "),
  ].join("\n");

  const twitter = [
    "New DigiSol media: website audit for Alberta businesses — design, speed, local SEO, and conversion.",
    "",
    url,
    "",
    `@${DIGISOL_X_HANDLE}`,
    "#DigiSol #WebsiteAudit #AlbertaSEO",
  ].join("\n");

  const fileBody = [
    "DIGISOL MEDIA — Website Audit",
    WEBSITE_AUDIT_TITLE,
    "",
    `Canonical page: ${url}`,
    `Video (MP4): ${videoUrl}`,
    `Home: ${DIGISOL_SITE_URL}`,
    `Contact: ${DIGISOL_SITE_URL}/#contact`,
    `Instagram: ${DIGISOL_INSTAGRAM_URL}`,
    `YouTube: ${DIGISOL_YOUTUBE_URL}`,
    `TikTok: ${DIGISOL_TIKTOK_URL}`,
    `X: ${DIGISOL_X_URL}`,
    "",
    "FACEBOOK / THREADS",
    facebook,
    "",
    ...(LINKEDIN_ENABLED ? ["LINKEDIN", linkedin, ""] : []),
    "INSTAGRAM / SHORT CAPTION",
    instagram,
    "",
    "X / TWITTER",
    twitter,
    "",
  ].join("\n");

  return {
    url,
    videoUrl,
    facebook,
    linkedin,
    instagram,
    twitter,
    fileBody,
    hashtags,
    instagramUrl: DIGISOL_INSTAGRAM_URL,
    instagramHandle: DIGISOL_INSTAGRAM_HANDLE,
  };
}
