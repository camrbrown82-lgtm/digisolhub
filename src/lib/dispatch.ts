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
};

export const DISPATCH_ISSUES: DispatchIssue[] = [
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
    "This month’s DigiSol Dispatch covers off-page SEO for Alberta companies: citations, Google Business, reviews, and a site that can convert the traffic.",
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
