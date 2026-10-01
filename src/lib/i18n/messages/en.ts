import { GOOGLE_AUTOPILOT_PILLARS } from "@/lib/googleAutopilot";
import { DIGISOL_GUARANTEES, GUARANTEE_FINE_PRINT, GUARANTEE_SHORT } from "@/lib/guarantee";
import type { CityCopy, PricingItemCopy } from "@/lib/i18n/types";
import type { LocationPage } from "@/lib/locations";
import { LAUNCH_PROMO } from "@/lib/pricing";
import {
  LOCAL_PRICE_COMPARISON,
  PACKAGE_COMPARISON,
  PRICING_FAQ,
  PRICING_VALUE_POINTS,
} from "@/lib/pricingContent";
import { SOCIAL_NETWORKS_LABEL } from "@/lib/site";
import type { HomeCopy } from "@/lib/visitorRegion";
import { enEmails } from "@/lib/i18n/messages/enEmails";

const homeGeneral: HomeCopy = {
  heroEyebrow: "Website design, engineering & growth marketing",
  heroTitleLead: "Website Design,",
  heroTitleAccent: "Development & Marketing",
  heroTitleTail: "",
  heroTagline: "Where Design, Engineering, and Growth Meet",
  heroSub: "Custom websites we design and build — then marketing that fills them",
  heroBody:
    "DigiSol partners with growing companies on brand-led websites, modern Next.js builds, SEO, and paid media. Whether you serve a local market or customers across borders, we design the site, engineer the platform, and help the right people find you and convert.",
  heroMarkets: "Remote-friendly · North America & beyond",
  whyTitle: "The DigiSol Advantage",
  whyBody:
    "We design the website, engineer it to convert, and market it — one partner, not a designer, a developer, and an agency.",
  designBook: "Pages built around how your customers actually inquire and buy",
  devSpeed: "Lightning-fast load times that protect SEO and conversions",
  mktPaid: "Targeted Meta & Search campaigns matched to your market",
  mktSeo: "SEO and local discovery tuned to the places you actually sell",
  audienceIntro:
    "Startups and established companies get the same playbook: a designed website, code that converts, and marketing that ships — wherever you operate.",
  audienceStartupBody:
    "A designed site and a lean custom build so you launch looking real — then clear positioning so the right customers can find you.",
  audienceStartupPoint: "Launch strategy and market positioning",
  audienceEstablishedBody:
    "Redesign the site customers actually use, then modernize the platform under it — with marketing and conversion work wired in for established companies.",
  servicesPaid: "Google Ads, Meta Ads, and SEO so searches in your markets turn into customers.",
  servicesCommerce:
    "Online stores and custom auction/web platforms for retailers and service businesses that need to sell, list, and grow.",
  auditBody: `A short presentation on what businesses should fix first — design, speed, SEO, and the path from visit to booked work. Export ready captions for ${SOCIAL_NETWORKS_LABEL} below.`,
  contactTitle: "Ready to Grow Your Business Online?",
  contactBody:
    "Get a project quote or free strategy consult for website design, custom development, SEO, and campaigns — built for companies that sell locally or across borders.",
  chatGreetingAudience: "businesses",
};

const homeAlberta: HomeCopy = {
  heroEyebrow: "Website design, engineering & growth — rooted in Alberta",
  heroTitleLead: "Website Design,",
  heroTitleAccent: "Development & Marketing",
  heroTitleTail: "",
  heroTagline: "Where Design, Engineering, and Growth Meet",
  heroSub: "Custom websites we design and build — then marketing that fills them",
  heroBody:
    "Based in Airdrie, DigiSol designs the site, engineers the platform, and runs SEO, Google Ads, and Meta campaigns for growing companies — from Calgary and Edmonton to clients across Canada and beyond. Alberta is home base; your market is wherever you sell.",
  heroMarkets: "Airdrie · Calgary · Edmonton · Across Alberta · Remote-friendly nationwide",
  whyTitle: "The DigiSol Advantage",
  whyBody:
    "We design the website, engineer it to convert, and market it — one partner, not a designer, a developer, and an agency. Deep Alberta roots, built to serve clients wherever they grow.",
  designBook: "Pages built around how your customers actually inquire and buy",
  devSpeed: "Lightning-fast load times that protect SEO and conversions",
  mktPaid: "Targeted Meta & Search campaigns matched to the markets you sell in",
  mktSeo: "SEO and local discovery — strong in Alberta map packs, tuned to wherever you operate",
  audienceIntro:
    "Startups and established companies get the same playbook: a designed website, code that converts, and marketing that ships — whether you are down the road in Alberta or scaling from farther afield.",
  audienceStartupBody:
    "A designed site and a lean custom build so you launch looking real — then clear positioning so the right customers can find you in your market.",
  audienceStartupPoint: "Launch strategy and market positioning",
  audienceEstablishedBody:
    "Redesign the site customers actually use, then modernize the platform under it — with marketing and conversion work wired in for established companies ready to grow.",
  servicesPaid:
    "Google Ads, Meta Ads, and SEO — including local Alberta search in Airdrie, Calgary, and Edmonton — so the markets you care about turn into customers.",
  servicesCommerce:
    "Online stores and custom auction/web platforms for retailers and service businesses that need to sell, list, and grow.",
  auditBody: `A short presentation on what businesses should fix first — design, speed, SEO, and the path from visit to booked work. Export ready captions for ${SOCIAL_NETWORKS_LABEL} below.`,
  contactTitle: "Ready to Grow Your Business Online?",
  contactBody:
    "Get a project quote or free strategy consult for website design, custom development, SEO, and campaigns. Alberta-rooted, happy to work with companies wherever you sell.",
  chatGreetingAudience: "growing businesses",
};

function homeCity(page: LocationPage): Partial<HomeCopy> {
  const isAirdrie = page.slug === "airdrie";
  return {
    heroEyebrow: page.regionLabel,
    heroTitleLead: isAirdrie ? "Airdrie Web Design," : "Website Design,",
    heroTitleAccent: "Development & Marketing",
    heroTitleTail: isAirdrie ? "" : `in ${page.name}`,
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
    auditBody: `A short presentation on what ${page.name} businesses should fix first — design, speed, local SEO, and the path from visit to booked work. Export ready captions for ${SOCIAL_NETWORKS_LABEL} below.`,
    contactTitle: `Ready to Grow Your ${page.name} Business?`,
    contactBody: `Get a project quote or free strategy consult for website design, custom development, local SEO, and campaigns in ${page.name} and nearby — Alberta-rooted, open to companies wherever you sell.`,
    chatGreetingAudience: `${page.name} businesses`,
  };
}

const homeLocationsHub: Partial<HomeCopy> = {
  heroEyebrow: "DigiSol service areas · Alberta-wide",
  heroTitleLead: "Website Design,",
  heroTitleAccent: "Development & Marketing",
  heroTitleTail: "across Alberta",
  heroTagline: "Where Design, Engineering, and Growth Meet",
  heroSub:
    "Custom websites we design and build — then marketing that fills them in every market we serve.",
  heroBody:
    "One DigiSol playbook for Calgary, Edmonton, Red Deer, Cochrane, and Airdrie — design, engineering, SEO, and campaigns. Alberta is home base; your market is wherever you sell.",
  heroMarkets: "Airdrie · Calgary · Edmonton · Red Deer · Cochrane · Across Alberta",
  contactTitle: "Ready to Grow Across Alberta?",
  contactBody:
    "Get a project quote or free strategy consult for website design, custom development, local SEO, and campaigns — Alberta-wide, open to companies wherever you sell.",
};

export const en = {
  home: {
    general: homeGeneral,
    alberta: homeAlberta,
    locationsHub: homeLocationsHub,
    city: homeCity,
  },
  /** English city wording lives in `LOCATION_PAGES`; other languages override it here. */
  cities: {} as Partial<Record<string, CityCopy>>,
  /** English item wording lives in `lib/pricing`; other languages override it here. */
  pricingItems: {} as Partial<Record<string, PricingItemCopy>>,

  meta: {
    homeTitle: "DigiSol | Airdrie Web Design, Development & Marketing",
    homeDescription:
      "Airdrie web design, Next.js development, SEO & digital marketing. DigiSol builds fast sites that help local customers find you and convert.",
    homeShareDescription:
      "Custom websites, SEO, and growth marketing from Airdrie, Alberta — one partner from first look to closed deal.",
    homeShareAlt: "DigiSol: custom websites, SEO, and growth marketing from Airdrie, Alberta",
    locationsTitle: "Alberta Service Cities | DigiSol",
    locationsDescription:
      "DigiSol website design, development, and local SEO for Calgary, Edmonton, Red Deer, Cochrane, and Airdrie. Same full DigiSol experience — Alberta-wide.",
    locationsShareDescription:
      "Full DigiSol homepage experience for Alberta-wide search — design, engineering, marketing, Kaylev, audit video, and contact.",
    locationsShareAlt: "DigiSol web design and marketing across Alberta",
    cityShareAlt: (city: string) => `DigiSol web design and marketing for ${city} businesses`,
  },

  /** Text on the 1200x630 link-preview cards rendered by `/og.jpg`. */
  shareCard: {
    subline: "Web design, SEO & marketing · Airdrie, Alberta",
    cta: "Get a free quote",
    home: "Custom websites we design and build, then marketing that fills them",
    citySubline: (city: string) => `Web design, SEO & marketing · ${city}, Alberta`,
    city: (city: string) => `Websites that bring ${city} businesses more customers`,
    locationsSubline: "Airdrie · Calgary · Edmonton · Red Deer · Cochrane",
    locations: "Web design, development and local SEO across Alberta",
    locationsCta: "Find your city",
    pricingSubline: "Transparent pricing · CAD, plus GST",
    pricing: (from: string) => `Custom websites from ${from}. Every price published.`,
    pricingCta: "Compare packages",
    aboutSubline: "Founder & CEO, DigiSol · Airdrie, Alberta",
    about: "Certified full-stack developer and digital marketer",
    aboutCta: "See credentials",
    blogKicker: "DigiSol Guides",
    blog: "Practical guides on Google reviews, local search and websites that bring in customers",
    blogCta: "Free guides",
    dispatchKicker: "DigiSol Dispatch",
    dispatch: "Local SEO and growth notes for Alberta companies",
    dispatchCta: "Read the latest issue",
    privacy: "How DigiSol handles your data",
    videoKicker: "DigiSol Media · Video",
    video: "Website audit: what Alberta businesses should fix first",
    videoCta: "Watch the presentation",
  },

  cityJsonLd: {
    offerDesignHome: "Airdrie web design and development",
    offerDesign: (city: string) => `Website design and development in ${city}`,
    offerMarketingHome: "Airdrie marketing and local SEO",
    offerMarketing: (city: string) => `Digital marketing and local SEO in ${city}`,
    q1Home: "Who offers web design and development in Airdrie?",
    q1: (city: string) => `Who offers website design and development in ${city}?`,
    a1Home:
      "DigiSol is an Airdrie-based studio that designs and builds custom websites (Next.js) for local businesses, then markets them with local SEO and paid campaigns.",
    a1: (city: string) =>
      `DigiSol designs and builds custom websites for ${city} businesses from our Airdrie headquarters, with local SEO and campaigns aimed at ${city} and nearby markets.`,
    q2Home: "Does DigiSol offer Airdrie marketing and SEO?",
    q2: (city: string) => `Does DigiSol offer marketing and SEO in ${city}?`,
    a2: (city: string) =>
      `Yes. DigiSol runs local SEO, Google Ads, and Meta campaigns for ${city}, plus conversion work so traffic turns into booked consultations.`,
    q3: "Where is DigiSol located?",
    a3: (address: string, phone: string) => `DigiSol is headquartered at ${address}. Phone ${phone}.`,
  },

  language: {
    switchLabel: "Language",
    suggestion: "",
    suggestionCta: "",
    dismiss: "Dismiss",
    englishOnly: "",
  },

  nav: {
    skip: "Skip to content",
    homeAria: "DigiSol home",
    logoAlt: "DigiSol — Engineering & Growth",
    primaryAria: "Primary",
    mobileAria: "Mobile",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    getQuote: "Get a free quote",
    contact: "Contact",
    hubLogin: "Hub login",
    links: [
      { href: "/#services", label: "Services" },
      { href: "/pricing", label: "Pricing" },
      { href: "/#why-us", label: "Why Us" },
      { href: "/blog", label: "Guides" },
      { href: "/#dispatch", label: "Dispatch" },
      { href: "/media/website-audit", label: "Media" },
      { href: "/locations/airdrie", label: "Airdrie" },
      { href: "/about", label: "About" },
    ],
  },

  footer: {
    jumpTo: "Jump to",
    jumps: [
      { href: "/#top", label: "Top" },
      { href: "/#why-us", label: "Why Us" },
      { href: "/#services", label: "Services" },
      { href: "/pricing", label: "Pricing" },
      { href: "/#audience", label: "Who We Help" },
      { href: "/blog", label: "Guides" },
      { href: "/#dispatch", label: "Dispatch" },
      { href: "/media/website-audit", label: "Media" },
      { href: "/about", label: "About" },
      { href: "/locations", label: "Locations" },
      { href: "/#contact", label: "Contact" },
    ],
    footerAria: "Footer",
    serviceCities: "Service cities",
    contact: "Contact",
    tagline: (region: string) =>
      `Website design, development, SEO & marketing for growing companies — headquarters in ${region}.`,
    rights: (year: number, region: string) => `© ${year} DigiSol. ${region}. All rights reserved.`,
    privacy: "Privacy Policy",
  },

  hero: {
    freeAudit: "Get a free website audit",
    bookConsultation: "Book a Free Consultation",
    exploreServices: "Explore Services",
  },

  dualThreat: {
    eyebrow: "Design. Build. Grow.",
    design: {
      title: "The Design Craft",
      custom: "Custom website design from your brand — not a template with a logo dropped on",
      layout: "Layout, type, and color so the next step is obvious",
      system: "A visual system ads and email can reuse, not a one-off mockup",
    },
    developer: {
      title: "The Developer Advantage",
      stack: "Modern Next.js / React engineering built for scale",
      noBloat: "Zero template bloat — custom platforms, not page builders",
      apis: "Custom API integrations that connect your real stack",
    },
    marketing: {
      title: "The Marketing Engine",
      funnels: "High-converting funnels from first click to close",
      cro: "Data-driven CRO so every experiment ships with evidence",
    },
  },

  kaylev: {
    eyebrow: "DigiSol AI · Kaylev",
    title: "Meet Kaylev: Your 24/7 Autonomous Growth Engine",
    intro:
      "Most websites just sit there. Yours should actively close deals. Lead capture, audits, campaigns, and hours back every week.",
    pillars: [
      {
        title: "24/7 Midnight Lead Capture",
        body: "Never miss a high-intent prospect. Kaylev catches social and website leads around the clock and engages them instantly—before interest cools down.",
      },
      {
        title: "Autonomous Site Audits & Local SEO",
        body: "Kaylev scans your web presence, flags performance leaks, and strengthens local ranking so customers in your area find you first.",
      },
      {
        title: "Multi-Channel Campaign Orchestration",
        body: "From automated email follow-ups to coordinated social touchpoints, Kaylev runs outreach pipelines without a manual click for every step.",
      },
      {
        title: "15+ Hours/Week Recovered",
        body: "Cut repetitive data entry, manual posting, and basic follow-ups so you can focus on closing deals and running the business.",
      },
    ],
    advantageTitle: "The DigiSol Advantage",
    advantage:
      "You get a world-class, custom-built website plus a dedicated AI employee on day one. No bloated monthly SaaS fees—just pure, automated growth.",
    advantageCity: (city: string) =>
      `You get a world-class, custom-built website plus a dedicated AI employee on day one—built to grow ${city} businesses. No bloated monthly SaaS fees—just pure, automated growth.`,
    freeAudit: "Get a free website audit",
    bookConsult: "Book a consultation",
    chatHint:
      "Prefer chat? Open Kaylev on this page and drop your URL for an instant audit walkthrough.",
  },

  services: {
    eyebrow: "Design, engineering & marketing",
    title: "One Roof, From Look to Lead",
    intro:
      "We design the website, build the platform, and fill the funnel. Same partner from first mockup to booked work.",
    design: {
      title: "Website Design",
      body: "Every engagement starts here. We design the look, the layout, and the path to inquire — then we build and market that same design. You are not buying a template with a logo slapped on.",
    },
    dev: {
      title: "Custom Web & App Development",
      body: "React, Next.js, and custom platforms that ship the design as a fast, durable site — high performance, no template bloat, no brittle page builders.",
    },
    paidTitle: "Search & Paid Media Campaigns",
    cro: {
      title: "Full-Funnel Integration & CRO",
      body: "Turn visitors into leads with analytics, conversion paths, and email/lead workflows wired into the product.",
    },
    commerceTitle: "E-Commerce & Platform Solutions",
    pricingLine: (from: string) => `Transparent pricing: custom websites from ${from} plus GST.`,
    seePackages: "See packages",
  },

  googleAutopilot: {
    eyebrow: "Google, checked every week",
    title: "Your Analytics, Search Console and Ads, Tuned Every Monday",
    intro:
      "Most businesses set up Google once and never look again. Settings drift, tracking breaks and ad money leaks. We check your Google accounts every week and fix what's wrong, usually in one click.",
    pillars: GOOGLE_AUTOPILOT_PILLARS,
    cta: "Ask for a Google setup check",
    ownership:
      "You stay the owner of every Google account. You just add DigiSol as a user, and you can remove us anytime.",
  },

  guarantee: {
    eyebrow: "The DigiSol guarantee",
    title: "Three promises, in writing",
    intro: "Every website project comes with these guarantees, spelled out in your quote.",
    items: DIGISOL_GUARANTEES,
    finePrint: GUARANTEE_FINE_PRINT,
    short: GUARANTEE_SHORT,
  },

  testimonials: {
    eyebrow: "Client words",
    title: "What clients say",
    intro: "Real feedback from the companies we build with.",
    owner: (company: string) => `Owner, ${company}`,
    inProgress: "Project in progress",
    stars: (n: number) => `${n} out of 5 stars`,
    visitSite: "Visit site",
    /** Set when a quote is shown translated; English shows the originals. */
    translatedNote: "",
    quotes: {} as Partial<Record<string, string>>,
  },

  ourWork: {
    eyebrow: "Our work",
    title: "Now in beta",
    intro: "Products we're building and running for our clients right now. More launching soon.",
    roleLabel: "What DigiSol does",
    status: { beta: "Beta", launched: "Live" },
    visitSite: "Visit site",
    /** Translations of `PROJECTS` copy; English shows the originals. */
    projects: {} as Partial<Record<string, { summary: string; role: string }>>,
  },

  techStack: {
    eyebrow: "Enterprise infrastructure",
    title: "Engineered with modern tools",
    intro:
      "DigiSol builds fast web applications on a stack we run ourselves: the site, the Hub, and the campaigns behind them.",
    items: [
      {
        name: "Supabase",
        category: "Backend & Database",
        description:
          "PostgreSQL, real-time data, and row-level security for the Hub and client workspaces.",
      },
      {
        name: "Cursor & Next.js",
        category: "Architecture & IDE",
        description: "AI-assisted development for fast, server-rendered React applications.",
      },
      {
        name: "Resend",
        category: "Transactional Email",
        description: "API email for lead follow-up, workflows, and transactional notices.",
      },
      {
        name: "OpenAI",
        category: "AI",
        description:
          "The models behind Kaylev, workflow drafts, poster copy, and website-audit writeups.",
      },
      {
        name: "Tailwind CSS",
        category: "User Interface",
        description:
          "Utility-first styling for responsive, accessible pages that stay on the DigiSol look.",
      },
    ],
    customEyebrow: "Custom solutions",
    customTitle: "Need a specific stack?",
    customBody:
      "The tools follow the job: performance, the workflow, and how the business actually sells.",
    customFoot: "Built for speed and search →",
  },

  websiteAudit: {
    eyebrow: "Media",
    title: "See How DigiSol Audits Your Website",
    bookConsult: "Book a consultation",
    fullPage: "Full media page & transcript",
    videoFallback: "Download the DigiSol website audit video",
  },

  auditExport: {
    title: "Export to socials",
    body: (linkedin: boolean, handle: string) =>
      `Ready captions for this website audit video — Facebook, ${linkedin ? "LinkedIn, " : ""}Instagram (@${handle}), or download the full social pack. Links point to wwwdigisol.com.`,
    copyFacebook: "Copy Facebook post",
    copyLinkedin: "Copy LinkedIn post",
    copyInstagram: "Copy Instagram caption",
    shareFacebook: "Share on Facebook",
    shareLinkedin: "Share on LinkedIn",
    shareInstagram: "Share to Instagram",
    copyUrl: "Copy media page URL",
    copyVideo: "Copy video URL",
    download: "Download social pack",
    sharing: "Sharing…",
    shared: "Shared — pick Instagram in the sheet",
    captionCopied: "Caption copied — paste in Instagram",
  },

  audience: {
    eyebrow: "Target audience",
    title: "Who We Help",
    startupTitle: "For Startups",
    startupPoints: [
      "Brand-true website design without a template look",
      "Rapid deployment and lean launch timelines",
      "Cost-effective full-stack MVP builds",
    ],
    establishedTitle: "For Established Companies",
    establishedPoints: [
      "Website redesign that matches how you sell today",
      "Site performance overhauls that restore speed and local SEO",
      "Advanced marketing integration across campaigns and product",
      "CRO and modernization of legacy web platforms",
    ],
  },

  blogHighlights: {
    eyebrow: "DigiSol Guides",
    title: "Practical guides for local business owners",
    intro:
      "Plain-language advice on Google reviews, local search, and websites that bring in customers. Free to read, no email required.",
    minRead: (minutes: number) => `${minutes} min read`,
    readGuide: "Read the guide",
    seeAll: "See all guides",
  },

  dispatchArchive: {
    titleAlberta: "Local SEO & growth notes for Alberta companies",
    titleGeneral: "SEO & growth notes for growing companies",
    introAlberta:
      "Local SEO, citations, reviews, and Next.js engineering notes for Airdrie, Calgary, Edmonton, and Red Deer. Read the issue, then export it to your socials — or subscribe below for the next one by email.",
    introGeneral:
      "SEO, citations, reviews, and Next.js engineering notes you can apply in any market. Read the issue, then export it to your socials — or subscribe below for the next one by email.",
    volume: (volume: number | string, month: string, year: number | string) =>
      `Volume ${volume} · ${month} ${year}`,
    minRead: (minutes: number) => `${minutes} min read`,
    readIssue: "Read the issue",
    exportSocials: "Export to socials",
  },

  dispatchSubscribe: {
    title: "Get the next Dispatch by email",
    body: "Two to four issues a month, emailed when each goes live. Unsubscribe any time. We won't send the issue you just read.",
    done: "You're on the list. Watch for the next issue in your inbox.",
    name: "Name",
    email: "Email",
    company: "Company",
    optional: "(optional)",
    companyPlaceholder: "Acme Co",
    subscribing: "Subscribing…",
    subscribe: "Subscribe to Dispatch",
    error: "Could not subscribe",
  },

  localSeo: {
    eyebrow: (city: string) => `Local search · ${city}`,
    headingHome: "Airdrie web design, development & marketing",
    heading: (city: string) => `${city} website design, development & marketing`,
    bodyHome:
      "DigiSol is headquartered in Airdrie. When someone searches for Airdrie web design, Airdrie web development, or Airdrie marketing, they should find a real local studio — not a national template shop. We design and build the site, then run the SEO and campaigns that help nearby customers book you.",
    designHeading: (city: string) => `Website design & development in ${city}`,
    designBody: (city: string) =>
      `Custom Next.js sites — not page-builder templates. Fast load times, clear service pages, mobile-first layouts, and conversion paths built around how ${city} customers actually inquire.`,
    designHome:
      "Whether you need a rebuild for a trades company, a professional-services site, or a storefront for an Airdrie retailer, engineering and design stay under one roof.",
    designCity: (city: string) =>
      `We work with ${city} companies from DigiSol’s Airdrie base, with the same NAP and Google Business Profile signals that support local rankings.`,
    marketingHeading: (city: string) => `${city} marketing, SEO & paid campaigns`,
    marketingBody: (city: string, nearby: string) =>
      `Local SEO for map-pack and organic visibility, Google Ads and Meta campaigns geotargeted to ${city} and ${nearby}, plus CRO so traffic turns into booked calls. Off-page work — citations, reviews, and consistent name/address/phone — is part of the plan, not an afterthought.`,
    whyTitle: "Why local businesses choose DigiSol",
    call: "Call",
    orForm: "or use the form below for a free strategy consult",
    coffee: " — coffee in Airdrie welcome.",
  },

  contact: {
    eyebrow: "Contact",
    mapHeading: "DigiSol headquarters, Airdrie",
    mapTitle: "Map of DigiSol's office in Airdrie, Alberta",
    directions: "Get directions",
    openInMaps: "View on Google",
    browseFirst: "Prefer to browse packages first?",
    seePricing: "See DigiSol pricing",
    otherWaysAria: "Other ways to reach DigiSol",
    talkNow: "Rather talk now?",
    nextTitle: "What happens next",
    steps: [
      "Send the form, call, or text. You reach Cameron, the founder, not a call centre.",
      "Free consultation to understand your goals, customers, and budget.",
      "A clear written quote with fixed package pricing. No obligation.",
    ],
    fullName: "Full Name",
    namePlaceholder: "Alex Rivera",
    business: "Business Name & Domain",
    businessPlaceholder: "Acme Co — acme.com",
    email: "Email Address",
    phone: "Phone",
    phoneHint: "(optional, for a quick call back)",
    service: "Service Needed",
    selectService: "Select a service",
    services: {
      design: "Website Design",
      dev: "Custom Web Dev",
      marketing: "Digital Marketing",
      combined: "Design + Build + Marketing",
    },
    details: "Project Details",
    detailsPlaceholder: "Goals, timeline, current stack, and what success looks like…",
    submit: "Request Free Consultation",
    sending: "Sending…",
    received: "Thanks, your message was received.",
    error: (email: string, phone: string) =>
      `Something went wrong sending the form. Email ${email} or call ${phone}.`,
  },

  quickQuote: {
    heading: "Get a free quote",
    sub: "Tell us the basics. You get a clear, no-obligation quote.",
    name: "Your name",
    email: "Email",
    phone: "Phone (optional)",
    need: "What do you need?",
    options: {
      design: "New website",
      dev: "Custom web app",
      marketing: "SEO & marketing",
      combined: "Website + marketing",
    },
    submit: "Get my free quote",
    sending: "Sending…",
    received: "Thanks, your message was received.",
    error: (email: string, phone: string) => `Something went wrong. Email ${email} or call ${phone}.`,
  },

  contactOptions: {
    call: "Call",
    callNumber: (phone: string) => `Call ${phone}`,
    text: "Text",
    email: "Email",
    book: "Book a call",
    bookDetail: "Pick a time that suits you",
    chat: "Chat with Kaylev",
    chatDetail: "Instant answers, day or night",
  },

  contactInfo: {
    founder: "Founder & CEO",
    credentials: "Certified Full Stack Developer and Digital Marketing and Social Media Specialist",
  },

  listings: {
    googleRating: "Google rating",
    leaveReview: "Leave a Google review",
    reviewAria: "Leave a Google review for DigiSol",
  },

  mobileBar: {
    aria: "Contact DigiSol",
    call: "Call",
    text: "Text",
    quote: "Free quote",
  },

  geoBanner: {
    looking: (city: string) => `Looking for DigiSol in ${city}?`,
    open: (city: string) => `Open your ${city} page`,
    stay: "Stay on Alberta home",
  },

  intlBanner: {
    unitedStates: "the United States",
    outsideCanada: "outside Canada",
    visiting: (where: string) =>
      `Visiting from ${where}? DigiSol builds websites and growth systems for companies everywhere.`,
    seeHow: "See how we work",
    cities: "Alberta service cities",
  },

  chat: {
    greetingAlberta: (name: string) => `Hey there! I'm ${name}, DigiSol's digital assistant. Happy to help Alberta teams and anyone scaling from farther afield fix conversion leaks and grow online.

Got a website? Share the URL and I'll run a free audit. No site yet, or curious about cost / what you'd need? I can set you up with a free consultation with Cameron — just tell me your email.`,
    greetingGeneral: (name: string) => `Hey there! I'm ${name}, DigiSol's digital assistant. Whether you're local or scaling from afar, we help businesses fix conversion leaks and grow online.

Got a website? Share the URL and I'll run a free audit. No site yet, or curious about cost / what you'd need? I can set you up with a free consultation with Cameron — just tell me your email.`,
    greetingAudit: (name: string) =>
      `Hey, I'm ${name}. I can run a free website audit for you right here. Paste your site address and I'll score it and email you the breakdown.`,
    panelAria: (name: string) => `${name} DigiSol chat`,
    subtitle: "Free website audit",
    close: "Close chat",
    working: "Working",
    typing: (name: string) => `${name} is typing…`,
    error: "Something went wrong. Try again.",
    inputLabel: (name: string) => `Message ${name}`,
    placeholder: "Type or use the mic…",
    mic: "Mic",
    micStrings: {
      stop: "Stop",
      unsupported: "Microphone dictation needs Chrome or Edge.",
      blocked: "Allow the microphone, then try again.",
      failed: "Microphone didn't start.",
    },
    send: "Send message",
    hide: "Hide",
    hideAria: (name: string) => `Hide ${name}`,
    openAria: (name: string) => `Chat with ${name}`,
  },

  about: {
    metaTitle: "About Cameron Brown | Credentials & Certifications | DigiSol",
    metaDescription:
      "Meet DigiSol founder Cameron Brown — career change from commercial sheet metal into website design, full-stack development, and digital marketing. Sundance College honors graduate, Mimo full-stack training, and HubSpot Academy certifications.",
    ogTitle: "About Cameron Brown | DigiSol",
    ogDescription:
      "Passion for design, engineering, and growth — with HubSpot certifications, a Sundance College diploma (honors), and full-stack training from Mimo.",
    eyebrow: "About · Credentials",
    photoAlt: (name: string) => `${name}, founder of DigiSol`,
    role: (title: string) => `${title}, DigiSol`,
    /** English bio lives in `lib/credentials`; other languages override it here. */
    bio: null as null | {
      headline: string;
      body: string[];
      education: { title: string; school: string; note?: string }[];
    },
    cta: "Book a free consultation",
    certTitle: "Certificates & badges",
    certBody:
      "HubSpot Academy certifications, SIMnet Microsoft Word belts, and supporting documents — proof behind the DigiSol craft.",
  },

  credentials: {
    filtersAria: "Credential filters",
    tabs: { all: "All", hubspot: "HubSpot", education: "Education & tools" },
    openPdf: "Open PDF",
    /** Blurbs by credential id; English lives in `lib/credentials`. */
    blurbs: {} as Partial<Record<string, string>>,
  },

  confirmation: {
    metaTitle: "Confirmation | DigiSol",
    metaDescription:
      "Your DigiSol consultation request has been received. We will follow up shortly.",
    title: "Confirmation",
    lead: "Your consultation request is booked.",
    body: "Thanks for reaching out. Cameron will follow up at the email you provided, typically within one business day.",
    back: "Back to DigiSol",
  },

  pricingSuccess: {
    metaTitle: "Payment received | DigiSol",
    metaDescription: "Thanks for starting with DigiSol. We will confirm scope shortly.",
    eyebrow: "Stripe checkout complete",
    title: "You're booked in",
    body: "Payment went through. Cameron will email you to confirm scope, timeline, and kickoff for your DigiSol engagement.",
    ref: "Ref:",
    back: "Back to DigiSol",
    contact: "Contact",
  },

  pricingPage: {
    metaTitle: "Pricing | DigiSol — Custom Websites from $4,500, SEO & Growth Packages",
    metaDescription:
      "Transparent website pricing for Alberta businesses: custom websites from $4,500, Growth Engine with local SEO at $7,500, and Full Funnel with ads at $12,000 (CAD, plus GST). Compare packages, timelines and FAQs.",
    ogTitle: "DigiSol Pricing — Custom Websites from $4,500",
    shareAlt: "DigiSol website, SEO, and marketing packages",
    cancelled: "Checkout cancelled — adjust your stack and try again anytime.",
    quoteHeading: "Not sure which package fits? Get a free quote",
    quoteSub:
      "Tell us the basics. You get a clear, no-obligation quote, and you can ask for 50/50 invoicing.",
    introEyebrow: "Transparent pricing",
    introTitle: (from: string) => `Custom websites from ${from}`,
    introBody: (gst: number) =>
      `Clear packages for design, build, local SEO and ads, with every price published. No templates, no surprise invoices. Prices in CAD, plus ${gst}% GST.`,
    compareCta: "Compare packages",
    quoteCta: "Get a free quote",
    valueAria: "Why DigiSol",
    valuePoints: PRICING_VALUE_POINTS,
    compareEyebrow: "Packages at a glance",
    compareTitle: "What each package includes",
    compareBody:
      "Every package is a custom design and build. Higher tiers add local SEO, automated follow-up and paid ads on top.",
    swipe: "Swipe the table sideways to compare all three.",
    tableCaption: "DigiSol website packages compared",
    packageHeader: "Package",
    oneTimePlusGst: "one-time, plus GST",
    included: "Included",
    notIncluded: "Not included",
    rows: PACKAGE_COMPARISON,
    compareFooterPre: "Pick a package, monthly growth and add-ons in the builder below, or",
    compareFooterLink: "get a free quote",
    compareFooterPost: "if you're not sure.",
    localEyebrow: "How we compare",
    localTitle: "What websites typically cost in Alberta",
    localBody:
      "Growth Engine includes local SEO and lead follow-up that are usually billed separately, at a price below a typical agency build.",
    localItems: LOCAL_PRICE_COMPARISON,
    localNote:
      "Typical ranges from 2026 Calgary and Canadian website pricing guides, before tax. Every project differs, so compare what's included, not just the price.",
    faqEyebrow: "Questions",
    faqTitle: "Pricing and process FAQ",
    faq: PRICING_FAQ,
  },

  pricingBuilder: {
    launchOffer: (code: string) => `Launch offer · code ${code}`,
    launchBody: (build: number, other: number) =>
      `${build}% off website build and design (Foundation, Growth Engine, Full Funnel) and ${other}% off everything else: the Hub, add-ons, and the first month of any retainer.`,
    launchWindow: `${LAUNCH_PROMO.startLabel} to ${LAUNCH_PROMO.endLabel}.`,
    launchStarts: `Starts ${LAUNCH_PROMO.startLabel}`,
    promoApplied: (code: string) => `${code} applied`,
    applyCode: (code: string) => `Apply ${code}`,
    perMonth: " / month",
    oneTime: " one-time",
    pctOff: (pct: number, code: string, recurring: boolean) =>
      `${pct}% off with ${code}${recurring ? " (first month)" : ""}`,
    pctOffShort: (pct: number, recurring: boolean) =>
      `${pct}% off${recurring ? " first month" : ""}`,
    typicalLaunch: (timeline: string) => `Typical launch: ${timeline}`,
    yourStack: "Your stack",
    selectSome: "Select Hub, a retainer, or an add-on.",
    promoLabel: "Promo code",
    apply: "Apply",
    promoSaves: (code: string, amount: string) => `${code} saves ${amount}`,
    promoInvalid: (value: string) => `"${value}" isn't a valid promo code.`,
    promoUpcoming: (code: string) => `${code} starts ${LAUNCH_PROMO.startLabel}.`,
    promoEnded: (code: string) => `${code} ended ${LAUNCH_PROMO.endLabel}.`,
    oneTimeSubtotal: "One-time subtotal",
    gst: (pct: number) => `GST (${pct}%)`,
    firstMonth: "First month",
    monthlySubtotal: "Monthly subtotal",
    mo: "/mo",
    thenMonthly: (amount: string) => `Then ${amount}/mo incl. GST`,
    workEmail: "Work email",
    emailPlaceholder: "you@company.ca",
    company: "Company",
    companyPlaceholder: "Your company",
    industry: "Industry",
    industryPlaceholder: "Trades, retail, clinic, hospitality…",
    cityIndustry: (city: string) => `${city} businesses`,
    notes: "Notes",
    notesPlaceholder: "Cities served, must-haves…",
    redirecting: "Redirecting to Stripe…",
    pay: "Pay securely with Stripe",
    consultFirst: "Prefer a consult first",
    stripeNotReady:
      "Stripe checkout activates once DigiSol's Stripe keys are on Vercel. You can still build your stack now — if payment is offline, use Book a consult and we'll invoice the same package.",
    stripeReady: (gst: number) =>
      `Secure Stripe Checkout · CAD · ${gst}% GST (Alberta) added at payment · scope confirmed after payment.`,
    invoice: "Website packages can also be paid 50% up front and 50% at launch by invoice.",
    requestInvoice: "Request an invoice",
    seeGuarantee: "See the guarantee",
    selectOne: "Select at least one option to continue.",
    checkoutUnavailable: "Checkout unavailable",
    checkoutFailed: "Checkout failed",
    strongEyebrow: "Your site scored well",
    strongTitle: "Use the traffic you already have",
    strongBody:
      "A strong audit does not need a rebuild first. These are the Hub, retainer, and growth options that turn a good site into booked work. A full website package stays optional at the bottom.",
    hubHeading: "DigiSol Hub",
    retainersHeading: "Monthly retainers",
    retainersBody: "Local growth, paid media, or the full growth retainer. Pick one, or skip.",
    noRetainer: "No retainer",
    noRetainerBody: "Hub and one-time add-ons only.",
    addonsHeading: "Growth add-ons",
    addonsBody: "Extra pages, city landings, and brand — layered on the site you already have.",
    rebuildSummary:
      "Need a full website rebuild instead? Open Foundation, Growth Engine, and Full Funnel",
    noPackage: "No website package",
    noPackageBody: "Stay on Hub, retainers, and add-ons only.",
    defaultEyebrow: "Scalable pricing",
    defaultTitle: "Build the engagement your industry needs",
    defaultBody: (gst: number) =>
      `Pick a core package, add a monthly growth engine if you want ongoing SEO or ads, then stack modules for cities, e-commerce, or custom apps. Same DigiSol dual threat — design, engineering, and marketing — for every Alberta industry. Listed prices exclude ${gst}% GST; tax is added at Stripe Checkout.`,
    coreHeading: "1 · Core package",
    monthlyHeading: "2 · Monthly growth (optional)",
    monthlyFeeNote:
      "Of each monthly rate, 18% is DigiSol's fee for setting your company up on this platform and running it. The other 82% goes directly to your ad spend, SEO, and the other services in that plan.",
    launchOnly: "Launch only",
    launchOnlyBody: "No monthly retainer — pay for the build and run campaigns later.",
    modulesHeading: "3 · Scale modules",
  },

  emails: enEmails,
};
