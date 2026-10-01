import { z } from "zod";

export const COMPETITIVE_DIMENSIONS = [
  { key: "website", label: "Website experience & speed" },
  { key: "onpage_seo", label: "On-page SEO" },
  { key: "local_seo", label: "Local SEO & Google Business Profile" },
  { key: "reviews", label: "Reviews & reputation" },
  { key: "content", label: "Content & authority" },
  { key: "offer", label: "Offer, pricing & messaging" },
  { key: "conversion", label: "Conversion (CTAs, forms, chat, booking)" },
  { key: "social", label: "Social & brand presence" },
  { key: "trust", label: "Trust signals (credentials, guarantees, proof)" },
] as const;

const verdict = z.enum(["strength", "weakness", "parity"]);
const level = z.enum(["high", "medium", "low"]);

export const competitiveReportSchema = z.object({
  executiveSummary: z
    .string()
    .describe("4-6 sentences: where the company stands versus these competitors and the single biggest lever."),
  overallScore: z.number().describe("0-100 competitive strength of the company versus this set."),
  position: z.enum(["leader", "contender", "challenger", "behind"]),
  dimensions: z
    .array(
      z.object({
        key: z.string().describe("One of the provided dimension keys."),
        label: z.string(),
        companyScore: z.number().describe("0-100"),
        competitorAverage: z.number().describe("0-100 average across competitors"),
        bestCompetitor: z.string().describe("Name of the strongest competitor on this dimension."),
        verdict,
        evidence: z.string().describe("Concrete evidence from the data: what the company does vs competitors."),
      }),
    )
    .describe("Exactly one entry per provided dimension, in the given order."),
  competitors: z.array(
    z.object({
      name: z.string(),
      url: z.string(),
      threatLevel: level,
      overview: z.string().describe("1-2 sentences on how they compete."),
      strengths: z.array(z.string()),
      weaknesses: z.array(z.string()),
      whatToLearn: z.string().describe("One thing the company should borrow or counter."),
    }),
  ),
  swot: z.object({
    strengths: z.array(z.object({ title: z.string(), detail: z.string() })),
    weaknesses: z.array(z.object({ title: z.string(), detail: z.string() })),
    opportunities: z.array(z.object({ title: z.string(), detail: z.string() })),
    threats: z.array(z.object({ title: z.string(), detail: z.string() })),
  }),
  actionPlan: z
    .array(
      z.object({
        priority: z.number().describe("1 = do first"),
        title: z.string(),
        dimension: z.string().describe("Dimension key this improves."),
        why: z.string().describe("Why it matters, tied to the competitor gap."),
        impact: level,
        effort: level,
        timeframe: z.enum(["this week", "30 days", "90 days"]),
        owner: z.enum(["DigiSol", "Client", "Kaylev"]),
        steps: z.array(z.string()).describe("4-8 concrete, ordered steps."),
        howToAchieve: z
          .string()
          .describe("Practical recommendations: tools, examples, wording, and what good looks like."),
        kpi: z.string().describe("How to measure success, with a target."),
      }),
    )
    .describe("8-12 actions ordered by priority."),
  quickWins: z.array(z.string()).describe("3-6 things that can be done in under a day."),
  keywordOpportunities: z
    .array(
      z.object({
        keyword: z.string(),
        intent: z.string(),
        whoRanks: z.string().describe("Which competitor appears to own it, or 'open'."),
        recommendation: z.string(),
      }),
    )
    .describe("5-10 local search terms worth targeting."),
  priceComparison: z
    .object({
      summary: z
        .string()
        .describe(
          "3-5 sentences comparing only the published prices listed in the data. Name who is higher or lower on comparable offers. If a company published no price, say so. Never invent a dollar amount.",
        ),
    })
    .describe("Narrative for the price table. The table itself is filled from the crawl."),
  dataGaps: z
    .array(z.string())
    .describe("What could not be verified from public data and should be checked by hand."),
});

export type CompetitiveReport = z.infer<typeof competitiveReportSchema>;

/** Checklist items that only matter in some industries (an auction house has no quote form or booking). */
export const OPTIONAL_CHECKS = [
  "form",
  "booking",
  "chat",
  "sms",
  "pricing_page",
  "prices",
  "services_page",
  "guarantee",
  "city_pages",
  "city_in_title",
  "map",
  "portfolio",
  "blog",
  "newsletter",
  "video",
] as const;

export type OptionalCheck = (typeof OPTIONAL_CHECKS)[number];

/** What a strong website looks like in this company's industry. Scoring and the report both use it. */
export type IndustryPlaybook = {
  /** Buttons customers in this industry should find everywhere, e.g. "Bid now". */
  primaryActions: string[];
  secondaryActions: string[];
  keyPages: Array<{ label: string; match: string[] }>;
  notApplicable: OptionalCheck[];
  /** What wins customers in this industry, in a few sentences. */
  notes: string;
};

export type CompetitiveInputs = {
  url: string;
  industry: string;
  location: string;
  competitorUrls: string[];
  playbook?: IndustryPlaybook;
};

export type CtaCount = { label: string; count: number; pages: string[] };

/** A price printed on a public page. The label is the package or service named beside it. */
export type PriceOffer = {
  label: string;
  price: string;
  note: string;
  url: string;
};

export type PriceComparisonRow = {
  company: string;
  siteUrl: string;
  role: "you" | "competitor";
  offer: string;
  price: string;
  note: string;
  source: string;
};

export type SiteSnapshot = {
  name: string;
  url: string;
  ok: boolean;
  score: number;
  ttfbMs: number | null;
  https: boolean;
  title: string | null;
  metaDescription: string | null;
  h1: string | null;
  hasJsonLd: boolean;
  issues: string[];
  excerpt: string;
  /** Homepage plus key pages (pricing, services, contact…), as readable text. */
  pages?: SitePage[];
  /** Features found on the site, e.g. "Click-to-call phone link". */
  features?: string[];
  /** Action buttons and links on the pages read, e.g. "Bid now" ×23. */
  ctas?: CtaCount[];
  /** Prices read from the public pages, with the offer they belong to. */
  prices?: PriceOffer[];
  /** First path segment of every internal link, e.g. "/auctions". */
  sections?: string[];
  error?: string;
};

export type SitePage = { url: string; title: string; text: string };

export type MarketPresence = {
  name: string;
  url: string;
  googleRating: string;
  reviewCount: string;
  /** "google" when rating/count came straight from the Places API. */
  googleSource?: "google" | "web";
  googleMapsUrl?: string;
  listings: string[];
  social: string[];
  notes: string;
};
