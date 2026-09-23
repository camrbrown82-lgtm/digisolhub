import { DIGISOL_SITE_URL } from "@/lib/site";
import { homeCopyAlberta, type HomeCopy } from "@/lib/visitorRegion";

export type LocationPage = {
  slug: string;
  name: string;
  regionLabel: string;
  headline: string;
  subhead: string;
  intro: string;
  focus: string[];
  nearby: string;
  keywords: string[];
};

/** Same homepage copy shape — city name swapped into hero / services / contact. */
export function homeCopyForLocation(page: LocationPage): HomeCopy {
  const base = homeCopyAlberta();
  return {
    ...base,
    heroEyebrow: page.regionLabel,
    heroTitleLead: "Website Design,",
    heroTitleAccent: "Development & Marketing",
    heroTitleTail: `in ${page.name}`,
    heroTagline: "Where Design, Engineering, and Growth Meet",
    heroSub: page.subhead,
    heroBody: page.intro,
    heroMarkets: `Also serving ${page.nearby}`,
    whyTitle: "The DigiSol Advantage",
    whyBody: `We design the website, engineer it to convert, and market it — one partner for ${page.name} companies, not a designer, a developer, and an agency.`,
    designBook: `Pages built around how ${page.name} customers actually inquire and buy`,
    mktPaid: `Targeted Meta & Search campaigns for ${page.name} and surrounding markets`,
    mktSeo: `Local SEO that wins the ${page.name} map pack and nearby searches`,
    servicesPaid: `Google Ads, Meta Ads, and local SEO for ${page.name} and nearby markets — so local searches turn into customers.`,
    servicesCommerce: `Online stores and custom auction/web platforms for ${page.name} retailers and service businesses that need to sell, list, and grow.`,
    auditBody: `A short presentation on what ${page.name} businesses should fix first — design, speed, local SEO, and the path from visit to booked work. Export ready captions for Facebook, LinkedIn, and Instagram below.`,
    contactTitle: `Ready to Grow Your ${page.name} Business?`,
    contactBody: `Get a project quote or free strategy consult for website design, custom development, local SEO, and campaigns in ${page.name} and nearby — Alberta-rooted, open to companies wherever you sell.`,
    chatGreetingAudience: `${page.name} businesses`,
  };
}

/** Alberta-wide `/locations` hub — same stack as home, not locked to one city. */
export function homeCopyForLocationsHub(): HomeCopy {
  const base = homeCopyAlberta();
  return {
    ...base,
    heroEyebrow: "DigiSol service areas · Alberta-wide",
    heroTitleLead: "Website Design,",
    heroTitleAccent: "Development & Marketing",
    heroTitleTail: "across Alberta",
    heroTagline: "Where Design, Engineering, and Growth Meet",
    heroSub:
      "Custom websites we design and build — then marketing that fills them in every market we serve.",
    heroBody:
      "One DigiSol playbook for Calgary, Edmonton, Red Deer, Cochrane, and Airdrie — design, engineering, SEO, and campaigns. Alberta is home base; your market is wherever you sell.",
    heroMarkets:
      "Airdrie · Calgary · Edmonton · Red Deer · Cochrane · Across Alberta",
    contactTitle: "Ready to Grow Across Alberta?",
    contactBody:
      "Get a project quote or free strategy consult for website design, custom development, local SEO, and campaigns — Alberta-wide, open to companies wherever you sell.",
  };
}

/** City landing pages aimed at local search (map pack + organic). */
export const LOCATION_PAGES: LocationPage[] = [
  {
    slug: "calgary",
    name: "Calgary",
    regionLabel: "Calgary and the Bow Valley",
    headline: "Website design, development & local SEO in Calgary",
    subhead:
      "Custom sites and growth marketing for Calgary companies that need more local leads — not another template.",
    intro:
      "DigiSol is based in Airdrie and works with Calgary businesses that want a fast custom website plus the local SEO, Google Ads, and Meta campaigns that fill it. Same NAP everywhere, clear service pages, and conversion paths built for Alberta customers.",
    focus: [
      "Calgary-focused website design and Next.js builds",
      "Google Business Profile and citation consistency for Calgary searches",
      "Google Ads and Meta campaigns geotargeted to Calgary and nearby cities",
      "CRO on forms, CTAs, and follow-up so Calgary traffic turns into booked calls",
    ],
    nearby: "Airdrie, Cochrane, Okotoks, and the Calgary metro",
    keywords: [
      "website design Calgary",
      "web developer Calgary",
      "local SEO Calgary",
      "digital marketing agency Calgary",
      "Google Ads Calgary",
    ],
  },
  {
    slug: "edmonton",
    name: "Edmonton",
    regionLabel: "Edmonton and the Capital Region",
    headline: "Website design, development & local SEO in Edmonton",
    subhead:
      "Engineering-led websites and full-funnel marketing for Edmonton companies ready to win local search.",
    intro:
      "From Airdrie, DigiSol builds custom websites for Edmonton businesses and pairs them with local SEO, citations, reviews strategy, and paid campaigns. You get one partner from first look to closed deal — not a stack of disconnected freelancers.",
    focus: [
      "Edmonton website design with fast, crawlable Next.js pages",
      "Local SEO for Edmonton map-pack and organic visibility",
      "Paid search and social targeted to Edmonton and surrounding communities",
      "Lead tracking into DigiSol Hub so Edmonton funnel performance stays visible",
    ],
    nearby: "St. Albert, Sherwood Park, and the greater Edmonton area",
    keywords: [
      "website design Edmonton",
      "SEO company Edmonton",
      "web developer Edmonton",
      "digital marketing Edmonton",
      "CRO agency Edmonton",
    ],
  },
  {
    slug: "red-deer",
    name: "Red Deer",
    regionLabel: "Red Deer and Central Alberta",
    headline: "Website design, development & local SEO in Red Deer",
    subhead:
      "Central Alberta companies get a custom site and the off-page work that helps Red Deer customers find you.",
    intro:
      "Red Deer sits between Calgary and Edmonton — DigiSol covers that corridor with website design, local SEO, and campaigns aimed at Central Alberta searches. Consistent name, address, and phone, a strong Google profile, and a site built to convert.",
    focus: [
      "Custom websites for Red Deer and Central Alberta businesses",
      "Local citations and Google Business Profile setup for Red Deer",
      "Search and social ads for Red Deer service areas",
      "Dispatch-style off-page SEO habits that compound month over month",
    ],
    nearby: "Lacombe, Innisfail, and Central Alberta towns",
    keywords: [
      "website design Red Deer",
      "web developer Red Deer",
      "local SEO Red Deer",
      "digital marketing Red Deer Alberta",
      "Google Ads Red Deer",
    ],
  },
  {
    slug: "cochrane",
    name: "Cochrane",
    regionLabel: "Cochrane and Rocky View County",
    headline: "Website design, development & local SEO in Cochrane",
    subhead:
      "Nearby to DigiSol’s Airdrie base — custom websites and local growth for Cochrane companies.",
    intro:
      "Cochrane businesses often compete in both town and Calgary metro searches. DigiSol designs and builds the site, then runs local SEO and campaigns so Cochrane customers — and Calgary-adjacent buyers — can find and contact you.",
    focus: [
      "Website design for Cochrane retailers, trades, and professional services",
      "Local SEO tuned for Cochrane and Rocky View County queries",
      "Listings and reviews that match your Cochrane NAP",
      "Conversion-focused pages that turn local visits into consults",
    ],
    nearby: "Airdrie, Calgary, and the Bow Valley corridor",
    keywords: [
      "website design Cochrane",
      "web developer Cochrane Alberta",
      "local SEO Cochrane",
      "digital marketing Cochrane AB",
      "website designer near Cochrane",
    ],
  },
  {
    slug: "airdrie",
    name: "Airdrie",
    regionLabel: "Airdrie — DigiSol home base",
    headline: "Website design, development & local SEO in Airdrie",
    subhead:
      "Built in Airdrie for Airdrie companies — custom websites, local SEO, and campaigns that win nearby customers.",
    intro:
      "DigiSol is headquartered in Airdrie. We design and engineer custom websites for local businesses, then run the SEO, Google Ads, and Meta work that helps Airdrie customers find you on the map pack and organic results.",
    focus: [
      "Airdrie website design and Next.js development",
      "Google Business Profile and citations with our Airdrie NAP",
      "Local SEO and ads for Airdrie and north Calgary metro",
      "On-page CRO so Airdrie traffic books a free consultation",
    ],
    nearby: "Calgary, Cochrane, and communities across Alberta",
    keywords: [
      "website design Airdrie",
      "web developer Airdrie",
      "local SEO Airdrie",
      "digital marketing Airdrie Alberta",
      "website designer Airdrie",
    ],
  },
];

export function getLocationPage(slug: string) {
  return LOCATION_PAGES.find((page) => page.slug === slug) ?? null;
}

export function locationPath(slug: string) {
  return `/locations/${slug}`;
}

export function locationUrl(slug: string) {
  return `${DIGISOL_SITE_URL}${locationPath(slug)}`;
}
