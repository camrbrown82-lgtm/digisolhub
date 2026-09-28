import { DIGISOL_INSTAGRAM_HANDLE, DIGISOL_INSTAGRAM_URL, DIGISOL_SITE_URL } from "@/lib/site";

export type DispatchSection = {
  heading: string;
  body: string[];
  bullets?: string[];
  /** Paragraphs shown after the bullet list. */
  after?: string[];
};

export type DispatchCta = {
  heading: string;
  body: string;
  href: string;
  label: string;
};

export type DispatchIssue = {
  slug: string;
  volume: number;
  month: string;
  year: number;
  title: string;
  excerpt: string;
  publishedAt: string;
  readingMinutes: number;
  keywords: string[];
  sections: DispatchSection[];
  /** Schema.org `about` topics for the article. */
  about?: string[];
  /** One line for LinkedIn describing what this issue covers. */
  socialBlurb?: string;
  /** Opening line of the subscriber email; defaults to "A new issue is live." */
  emailIntro?: string;
  emailSubject?: string;
  /** Replaces the default "book a consultation" call to action. */
  cta?: DispatchCta;
};

export const DISPATCH_ISSUES: DispatchIssue[] = [
  {
    slug: "digisol-launch-growth-platform-for-alberta-businesses",
    volume: 2,
    month: "September",
    year: 2026,
    title: "DigiSol Officially Launches: The All-in-One Growth Platform for Alberta Businesses",
    excerpt:
      "DigiSol is officially open. A custom website, the DigiSol Hub, and Kaylev, your AI assistant, work together to bring in leads, follow up automatically, and show you exactly what’s working. Here’s everything the platform does for your business, and the launch packages to get started.",
    publishedAt: "2026-09-28",
    readingMinutes: 8,
    keywords: [
      "marketing automation Alberta",
      "small business CRM Alberta",
      "AI lead capture Alberta",
      "website design Airdrie",
      "local SEO Calgary",
      "Google Ads management Alberta",
    ],
    about: [
      "Marketing automation platform for small businesses",
      "Small business CRM",
      "AI lead capture",
      "Alberta web design and development",
    ],
    socialBlurb:
      "DigiSol is officially launched: one platform for Alberta businesses that combines a custom website, a CRM with automated follow-ups, AI lead capture, and analytics that show what’s working. Launch packages start at $750.",
    emailSubject: "It’s official: DigiSol has launched (Dispatch Vol. 2)",
    emailIntro:
      "It’s official: DigiSol has launched. This is our biggest issue yet, a full breakdown of what the platform can do for your business, plus the launch packages.",
    cta: {
      heading: "Launch packages are live",
      body: "Start with the DigiSol Hub for $750, or choose a website package and add a monthly retainer. Prices in CAD before GST, with secure checkout.",
      href: "/pricing",
      label: "See launch pricing",
    },
    sections: [
      {
        heading: "DigiSol is officially open for business",
        body: [
          "For months, every part of DigiSol ran on our own business first: the website, the lead capture, the automated follow-ups, the analytics, and Kaylev. It works, and today it’s available to companies across Airdrie, Calgary, Edmonton, Red Deer, and the rest of Alberta.",
          "DigiSol is not just a web design shop. It’s a growth platform: the software that brings customers in, follows up with them automatically, and shows you which marketing is paying off. Every company gets its own private workspace, its own brand kit, and its own data. Nothing is shared between companies.",
        ],
      },
      {
        heading: "One platform instead of five tools",
        body: [
          "Most small businesses pay for a website builder, a CRM, an email tool, an analytics dashboard, and a design app, and none of them talk to each other. DigiSol puts it all in one place:",
        ],
        bullets: [
          "A custom website built to convert: designed for your brand (not a template), fast on phones, and wired to capture every lead.",
          "The DigiSol Hub: your CRM, contacts, pipeline, email campaigns, and automated workflows.",
          "Kaylev, your AI assistant: answers visitors around the clock, writes your emails, and analyses your competitors.",
          "Analytics: website traffic, Google Ads, Meta Ads, and Instagram results in one dashboard.",
          "Branded content: posters, emails, and exports that always use your logo, colours, and voice.",
        ],
      },
      {
        heading: "Analytics that show what’s actually working",
        body: [
          "Clicks and page views don’t pay the bills. Hub Analytics connects your marketing to real leads so you know where to spend.",
        ],
        bullets: [
          "Traffic, top pages, and where visitors come from, straight from Google Analytics.",
          "Google Ads conversions, Meta Ads, and Instagram insights shown next to your website traffic.",
          "New Demographics: cities, devices, age, and gender, with your ad visitors compared to everyone else.",
          "Bot filtering that flags data-centre traffic, so fake visits don’t steer your ad targeting.",
          "Conversion tracking for forms, chats, calls, email clicks, bookings, and purchases.",
        ],
      },
      {
        heading: "Automated workflows without the busywork",
        body: [
          "Following up is where most small businesses lose the sale. The Hub does it for you, politely and on time.",
        ],
        bullets: [
          "Every lead lands in one place: website forms, chat conversations, and Google Ads lead forms, with an instant alert.",
          "Describe the follow-up you want, and Kaylev drafts the emails, matches the right one to each contact, and shows you an approval table before anything sends.",
          "Guardrails built in: no more than one automatic email per person every 24 hours, sequences stop the moment someone unsubscribes, and they step aside when you move a lead forward.",
          "See everyone in each workflow, where they are, and what they received last.",
          "Spam and email security scanners are filtered out, so you only nurture real people.",
          "Test two versions of a campaign and see which one wins.",
        ],
      },
      {
        heading: "Kaylev: the assistant that never clocks out",
        body: [
          "Kaylev is DigiSol’s built-in AI. It works inside your Hub and on your website, using your business details and your brand kit.",
        ],
        bullets: [
          "Answers website visitors 24/7 and saves their details straight to your contacts.",
          "Runs free website audits on the spot: speed, titles, descriptions, and the basics Google looks for.",
          "New competitive analysis: finds your top local competitors, scores you against them in nine areas (website, SEO, local SEO, reviews, content, offer, conversion, social, and trust), and hands you a prioritised action plan with step-by-step instructions.",
          "Writes emails in your brand voice and designs posters with your official logo and colours.",
        ],
      },
      {
        heading: "Launch packages",
        body: [
          "Start with what you need today and add more as you grow. Every website package sends its leads straight into your own DigiSol Hub workspace.",
        ],
        bullets: [
          "DigiSol Hub, $750 one time: your workspace, lead capture, automated follow-ups, and campaign monitoring. Works with the website you already have.",
          "Foundation, $4,500: a custom-designed website (up to 6 pages), mobile-first and fast, with lead capture into the Hub, Google Analytics tracking, and local business schema.",
          "Growth Engine, $7,500: everything in Foundation plus your Google Business Profile, local SEO, conversion-focused pages, an automated nurture workflow, and city landing pages.",
          "Full Funnel, $12,000: everything in Growth Engine plus Google Ads and Meta campaigns, landing pages built for paid traffic, a campaign dashboard, and quarterly strategy reviews.",
          "Monthly retainers: Local Growth $1,200, Paid Media $1,800 (ad spend separate), or Full Growth $2,800 with local SEO, ads, content, and priority support.",
          "Add-ons: extra pages, city landing packs, e-commerce, custom web apps, and brand kit refreshes.",
        ],
        after: [
          "All prices are in Canadian dollars before GST. Build your own package and check out securely at https://wwwdigisol.com/pricing, or book a free consultation and we’ll recommend the right fit.",
        ],
      },
      {
        heading: "How to get started",
        body: [
          "Three easy ways to take the first step:",
        ],
        bullets: [
          "Get a free website audit: drop your URL into Kaylev’s chat at https://wwwdigisol.com.",
          "Book a free consultation at https://wwwdigisol.com/#contact.",
          "Choose your package at https://wwwdigisol.com/pricing.",
        ],
        after: [
          "Know a business owner juggling five tools to do one job? Forward them this issue.",
        ],
      },
    ],
  },
  {
    slug: "september-2026",
    volume: 1,
    month: "September",
    year: 2026,
    title: "Off-Page SEO for Alberta Companies: Citations, Reviews, and Local Trust",
    excerpt:
      "How Airdrie, Calgary, Edmonton, and Red Deer businesses earn map-pack visibility with off-page SEO — not more website pages.",
    publishedAt: "2026-09-19",
    readingMinutes: 6,
    keywords: [
      "off-page SEO Alberta",
      "local SEO Airdrie",
      "Calgary local citations",
      "Edmonton Google Business Profile",
      "Next.js SEO",
      "full-funnel CRO",
    ],
    sections: [
      {
        heading: "Why off-page SEO decides who shows up first",
        body: [
          "On-page work gets your Next.js site fast, crawlable, and clear. Off-page SEO is what tells Google the business is real, local, and trusted. For Alberta companies, that means consistent name, address, and phone across the web, a complete Google Business Profile, and reviews from nearby customers.",
          "DigiSol is based in Airdrie and builds both sides: custom web engineering and the local growth work that fills the funnel. This first DigiSol Dispatch covers the off-page moves that help local companies in Calgary, Edmonton, Red Deer, and Airdrie get found without paying for every click.",
        ],
      },
      {
        heading: "Fix the listing before you chase links",
        body: [
          "Google’s local pack still leans on the Business Profile. Hours, services, photos, categories, and the website URL have to match the site. If the listing says Airdrie and the site says somewhere else, rankings stall.",
          "Use one public address, one phone, and one website: https://wwwdigisol.com. Point Facebook, the Google listing, and the site at the same facts. That is off-page SEO at the foundation — not a paid ad.",
        ],
      },
      {
        heading: "Citations that actually help Alberta searches",
        body: [
          "A citation is any mention of the business with contact details. Start with Google, Facebook, and major Canadian directories, then add industry and city pages that people in Calgary or Edmonton actually use.",
          "Skip junk link farms. A few accurate listings beat fifty mismatched ones. Every citation should send people back to https://wwwdigisol.com or the contact form at https://wwwdigisol.com/#contact.",
        ],
      },
      {
        heading: "Reviews are off-page content",
        body: [
          "Reviews are the off-page signal customers read first. Ask after a job is done. Reply to every review. Mention the service and the city only when it is natural — “website rebuild in Airdrie,” not keyword stuffing.",
          "The Google rating block on wwwdigisol.com exists so people can leave that review in two clicks. Pair it with Facebook so social proof and the listing stay in the same loop.",
        ],
      },
      {
        heading: "Engineering still matters",
        body: [
          "Off-page attention is wasted if the page is slow. DigiSol’s Next.js builds keep load times short so local SEO traffic can convert. Full-funnel CRO then turns that visit into a booked consult — forms, tracking, and follow-up under one roof.",
          "If you want the September playbook applied to your company, book a free consultation at https://wwwdigisol.com/#contact.",
        ],
      },
    ],
  },
];

export function dispatchPath(slug: string) {
  return `/dispatch/${slug}`;
}

export function dispatchUrl(slug: string) {
  return `${DIGISOL_SITE_URL}${dispatchPath(slug)}`;
}

export function getDispatchIssue(slug: string) {
  return DISPATCH_ISSUES.find((issue) => issue.slug === slug);
}

export function latestDispatchIssue() {
  return [...DISPATCH_ISSUES].sort((a, b) =>
    b.publishedAt.localeCompare(a.publishedAt),
  )[0];
}

/** Published issues, newest first, for the archive. */
export function dispatchArchiveIssues(asOf = new Date()) {
  return publishedDispatchIssues(asOf).reverse();
}

export function publishedDispatchIssues(asOf = new Date()) {
  const today = asOf.toISOString().slice(0, 10);
  return DISPATCH_ISSUES.filter((issue) => issue.publishedAt <= today).sort(
    (a, b) => a.publishedAt.localeCompare(b.publishedAt),
  );
}

export function dispatchSocialPack(issue: DispatchIssue) {
  const url = dispatchUrl(issue.slug);
  const hashtags = [
    "#DigiSol",
    "#AlbertaSEO",
    "#LocalSEO",
    "#Airdrie",
    "#Calgary",
    "#Edmonton",
    "#RedDeer",
    "#Nextjs",
  ];
  const facebook = [
    `DigiSol Dispatch Vol. ${issue.volume} — ${issue.month} ${issue.year}`,
    issue.title,
    "",
    issue.excerpt,
    "",
    `Read it: ${url}`,
    `Book a consult: ${DIGISOL_SITE_URL}/#contact`,
    "",
    hashtags.join(" "),
  ].join("\n");

  const linkedin = [
    `${issue.title}`,
    "",
    issue.excerpt,
    "",
    issue.socialBlurb ||
      "This DigiSol Dispatch covers off-page SEO for Alberta companies: citations, Google Business, reviews, and a site that can convert the traffic.",
    "",
    `Full issue: ${url}`,
    `Work with DigiSol: ${DIGISOL_SITE_URL}/#contact`,
  ].join("\n");

  const instagram = [
    `${issue.title}`,
    "",
    issue.excerpt,
    "",
    `Follow @${DIGISOL_INSTAGRAM_HANDLE} · Link in bio → ${url}`,
    DIGISOL_INSTAGRAM_URL,
    "",
    hashtags.join(" "),
  ].join("\n");

  const fileBody = [
    `DIGISOL DISPATCH — Volume ${issue.volume}`,
    `${issue.month} ${issue.year}`,
    issue.title,
    "",
    `Canonical: ${url}`,
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
  ].join("\n");

  return {
    url,
    facebook,
    linkedin,
    instagram,
    fileBody,
    hashtags,
    instagramUrl: DIGISOL_INSTAGRAM_URL,
    instagramHandle: DIGISOL_INSTAGRAM_HANDLE,
  };
}
