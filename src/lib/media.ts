import {
  DIGISOL_INSTAGRAM_HANDLE,
  DIGISOL_INSTAGRAM_URL,
  DIGISOL_SITE_URL,
} from "@/lib/site";

/** Stable public path for the DigiSol website-audit presentation (emails / Hub / GBP). */
export const WEBSITE_AUDIT_VIDEO_PATH = "/media/digisol-website-audit.mp4";
export const WEBSITE_AUDIT_PAGE_PATH = "/media/website-audit";

export const WEBSITE_AUDIT_VIDEO_URL = `${DIGISOL_SITE_URL}${WEBSITE_AUDIT_VIDEO_PATH}`;
export const WEBSITE_AUDIT_PAGE_URL = `${DIGISOL_SITE_URL}${WEBSITE_AUDIT_PAGE_PATH}`;

export const WEBSITE_AUDIT_UPLOAD_DATE = "2026-09-21";

export const WEBSITE_AUDIT_TITLE =
  "DigiSol Website Audit — How Alberta Businesses Win Online";
export const WEBSITE_AUDIT_DESCRIPTION =
  "A DigiSol presentation on website audits for Alberta businesses: what we look for in design, speed, local SEO, and conversion paths — and how a clear audit turns into more booked work in Airdrie, Calgary, Edmonton, and across Alberta.";

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
    "",
    "FACEBOOK / THREADS",
    facebook,
    "",
    "LINKEDIN",
    linkedin,
    "",
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
