import { DIGISOL_FOUNDER, DIGISOL_SITE_URL } from "@/lib/site";

export type CredentialItem = {
  id: string;
  title: string;
  issuer: string;
  kind: "certificate" | "badge" | "diploma" | "document";
  image?: string;
  href?: string;
  valid?: string;
  blurb?: string;
};

export const FOUNDER_PHOTO = "/about/cameron-brown.jpg";

export const FOUNDER_BIO = {
  name: DIGISOL_FOUNDER,
  headline: "Design, code, and growth — built with the same hands-on grit",
  body: [
    `I'm ${DIGISOL_FOUNDER}, founder of DigiSol in Airdrie. After fifteen years as a commercial sheet metal installer, I made a deliberate career change into the work I care about most: designing websites people trust, engineering them to perform, and marketing them so Alberta businesses get found.`,
    "That background still shows up in how I work — measure twice, ship clean, and own the finish. I bring the same intensity to full-stack builds, local SEO, email and social campaigns, and conversion paths that turn traffic into booked consults.",
    "I graduated with honors from Sundance College (Digital Marketing and Social Media Diploma), trained in Full Stack Development through Mimo, and continue stacking HubSpot Academy certifications so strategy and delivery stay current.",
  ],
  education: [
    {
      title: "Digital Marketing and Social Media Diploma",
      school: "Sundance College",
      note: "Graduated with honors",
    },
    {
      title: "Full Stack Development",
      school: "Mimo",
      note: "Modern web engineering foundations",
    },
  ],
} as const;

export const CREDENTIALS: CredentialItem[] = [
  {
    id: "hubspot-email",
    title: "Email Marketing Certified",
    issuer: "HubSpot Academy",
    kind: "certificate",
    image: "/credentials/hubspot-email-marketing.png",
    valid: "Oct 2025 – Nov 2027",
    blurb: "Segmentation, deliverability, design, and measurement.",
  },
  {
    id: "hubspot-inbound",
    title: "Inbound Marketing Certified",
    issuer: "HubSpot Academy",
    kind: "certificate",
    image: "/credentials/hubspot-inbound-marketing.png",
    valid: "Oct 2025 – Nov 2027",
    blurb: "Content, social promotion, lead nurture, and customer marketing.",
  },
  {
    id: "hubspot-sales",
    title: "Sales Enablement Certified",
    issuer: "HubSpot Academy",
    kind: "certificate",
    image: "/credentials/hubspot-sales-enablement.png",
    valid: "Oct 2025 – Nov 2027",
    blurb: "Marketing-driven sales strategy and enablement tooling.",
  },
  {
    id: "hubspot-social",
    title: "Social Media Certified",
    issuer: "HubSpot Academy",
    kind: "certificate",
    image: "/credentials/hubspot-social-media.png",
    valid: "Oct 2025 – Nov 2027",
    blurb: "Inbound social strategy, engagement, policy, and ROI.",
  },
  {
    id: "simnet-purple",
    title: "Word Purple Belt (L3)",
    issuer: "McGraw Hill SIMnet",
    kind: "badge",
    image: "/credentials/simnet-word-purple-belt.png",
    blurb: "Advanced Microsoft Word proficiency.",
  },
  {
    id: "simnet-white",
    title: "Word White Belt (L1)",
    issuer: "McGraw Hill SIMnet",
    kind: "badge",
    image: "/credentials/simnet-word-white-belt.png",
    blurb: "Foundational Microsoft Word proficiency.",
  },
  {
    id: "simnet-yellow",
    title: "Word Yellow Belt",
    issuer: "McGraw Hill SIMnet",
    kind: "document",
    href: "/credentials/simnet-word-yellow-belt.pdf",
    blurb: "SIMnet Microsoft Word Yellow Belt certification (PDF).",
  },
];

export const CREDENTIALS_PAGE_PATH = "/about";
export const CREDENTIALS_PAGE_URL = `${DIGISOL_SITE_URL}${CREDENTIALS_PAGE_PATH}`;
