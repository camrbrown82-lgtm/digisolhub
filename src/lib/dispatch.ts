import { DIGISOL_INSTAGRAM_HANDLE, DIGISOL_INSTAGRAM_URL, DIGISOL_SITE_URL } from "@/lib/site";

export type DispatchSection = {
  heading: string;
  body: string[];
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
};

export const DISPATCH_ISSUES: DispatchIssue[] = [
  {
    slug: "whats-new-at-digisol-september-2026",
    volume: 2,
    month: "September",
    year: 2026,
    title: "What’s New at DigiSol: Kaylev, Smarter Follow-Ups, and Cleaner Lead Data",
    excerpt:
      "Kaylev now answers visitors 24/7 and audits more Alberta industries, follow-ups pace themselves, spam and email scanners stay out of your lead list, and Analytics shows who is actually visiting.",
    publishedAt: "2026-09-28",
    readingMinutes: 5,
    keywords: [
      "website design Airdrie",
      "web developer Airdrie",
      "local SEO Airdrie",
      "AI lead capture Alberta",
      "small business CRM Alberta",
      "marketing automation Calgary",
    ],
    about: [
      "AI lead capture",
      "Marketing automation for Alberta businesses",
      "Airdrie web development",
    ],
    socialBlurb:
      "This DigiSol Dispatch covers what’s new: Kaylev’s 24/7 lead capture and audits, follow-ups that pace themselves, spam-free lead lists, and visitor demographics for Alberta companies.",
    sections: [
      {
        heading: "Why a “what’s new” issue",
        body: [
          "Most of what DigiSol ships lives behind the scenes: the website you see, plus the Hub and Kaylev working after hours. This issue is a quick tour of what changed this month, and what it means if you run a business in Airdrie, Calgary, Edmonton, or Red Deer.",
          "Dispatch is also moving from once a month to two to four issues a month: shorter notes on local SEO, website design, and the follow-up systems that turn visits into booked work.",
        ],
      },
      {
        heading: "Kaylev answers your website around the clock",
        body: [
          "Kaylev is DigiSol’s AI assistant. On wwwdigisol.com it answers questions, captures the lead, and can walk a visitor through a free audit of their own site on the spot. Drop a URL in the chat and it checks speed, titles, descriptions, and the basics Google looks for.",
          "The same assistant is part of every DigiSol build, so your site keeps catching leads at midnight instead of waiting for Monday morning.",
        ],
      },
      {
        heading: "Free audits for more Alberta industries",
        body: [
          "Kaylev started with trades: HVAC, plumbing, and electrical companies around Calgary and Edmonton. It now finds and audits local businesses across more sectors: roofing, landscaping, renovation, cleaning, auto repair, and then dental, legal, accounting, salons, fitness, real estate, and clinics.",
          "Each audit scores the site and lists the fixes that matter most. Audits only go to businesses that publish a contact email on their own website, which keeps outreach within Canada’s anti-spam rules (CASL).",
        ],
      },
      {
        heading: "Follow-ups that pace themselves",
        body: [
          "The DigiSol Hub now runs follow-up sequences with guardrails built in. Nobody gets two automatic emails within 24 hours. Sequences stop the moment someone unsubscribes, and they step aside when you move a lead forward in the pipeline, so you are never double-messaging someone you are already talking to.",
          "Each workflow now shows everyone in it, where they are, and what was sent last, so you can see the whole nurture at a glance.",
        ],
      },
      {
        heading: "Real people in, spam and scanners out",
        body: [
          "Two things quietly inflate lead lists: form spam and email security scanners. The contact form now recognises the usual pitches (review removal, pay-after-results SEO, move-to-WhatsApp offers) and files them away without alerts, ad conversions, or follow-up emails.",
          "Many offices run scanners that open and click every link in a new email within seconds. The Hub now ignores anything under 20 seconds after delivery, waits a day to see if a real person follows up, and only then stops emailing that address. Your “engaged” list stays people, not software.",
        ],
      },
      {
        heading: "See who is visiting, and brand it your way",
        body: [
          "Analytics has a new Demographics section: cities, devices, and (once traffic is large enough) age and gender, with your Google Ads visitors shown next to everyone else. It also flags data-center towns, so bot traffic does not steer your targeting.",
          "Every company in the Hub keeps its own brand kit: colours, logo, and voice for posters, emails, and exports. Nothing from DigiSol’s brand bleeds into yours.",
          "Want any of this set up for your company? Book a free consultation at https://wwwdigisol.com/#contact, or ask Kaylev for a free audit on the homepage.",
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
