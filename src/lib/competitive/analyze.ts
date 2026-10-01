import { generateText, Output } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";
import { runWebsiteAudit } from "@/lib/agent/websiteAudit";
import { findPlaceForSite, placesConfigured } from "@/lib/googleReviews";
import { getOpenAIApiKey } from "@/lib/openai";
import { crawlSiteContent } from "@/lib/competitive/siteContent";
import { htmlToPlainExcerpt } from "@/lib/prospectAudit/casl";
import { BLOCKED_DOMAINS } from "@/lib/prospectAudit/discover";
import { normalizeProspectUrl, prospectHostKey } from "@/lib/prospectAudit/seedCatalog";
import {
  competitiveReportSchema,
  OPTIONAL_CHECKS,
  type CompetitiveInputs,
  type IndustryPlaybook,
  type MarketPresence,
  type OptionalCheck,
  type PriceComparisonRow,
  type SiteSnapshot,
} from "@/lib/competitive/schema";
import {
  applyScorecard,
  scorecardPromptBlock,
  type ScoreComparison,
  type Scorecard,
  type StoredCompetitiveReport,
} from "@/lib/competitive/scoring";

export const COMPETITIVE_RESEARCH_MODEL =
  process.env.OPENAI_COMPETITIVE_RESEARCH_MODEL?.trim() || "gpt-4.1-mini";
export const COMPETITIVE_REPORT_MODEL =
  process.env.OPENAI_COMPETITIVE_REPORT_MODEL?.trim() || "gpt-4.1";

const MAX_COMPETITORS = 4;

function openaiClient() {
  const apiKey = getOpenAIApiKey();
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");
  return createOpenAI({ apiKey });
}

function tokensOf(usage: { inputTokens?: number; outputTokens?: number } | undefined) {
  return (usage?.inputTokens ?? 0) + (usage?.outputTokens ?? 0);
}

export function toSiteUrl(raw: string) {
  const value = raw.trim();
  if (!value) return "";
  return normalizeProspectUrl(value.startsWith("http") ? value : `https://${value}`);
}

/** True when two websites are the same host, ignoring www. */
export function hostsMatch(a: string, b: string) {
  if (!a.trim() || !b.trim()) return false;
  const left = prospectHostKey(a.includes("://") ? a : `https://${a}`);
  const right = prospectHostKey(b.includes("://") ? b : `https://${b}`);
  return Boolean(left && right && left === right);
}

/**
 * Name of the business whose site was crawled. Used when that site is not the
 * Working-on company, so a DealFinder run is not written up as DigiSol.
 */
export function businessNameFromSite(snapshot: {
  title: string | null;
  h1: string | null;
  url: string;
}) {
  const clean = (value: string) =>
    value
      .split(/\s+[|–—]\s+|\s+-\s+/)[0]
      .replace(/^(home|welcome)\s+/i, "")
      .replace(/\s+(home|homepage|welcome)$/i, "")
      .trim();
  for (const raw of [snapshot.title, snapshot.h1]) {
    const name = raw ? clean(raw) : "";
    if (name.length >= 2 && name.length <= 80 && !/^home$/i.test(name)) return name;
  }
  try {
    const host = new URL(snapshot.url).hostname.replace(/^www\./i, "");
    const label = host.split(".")[0] || host;
    return label.replace(/[-_]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
  } catch {
    return "This company";
  }
}

const CANADIAN_REGIONS = [
  "Alberta",
  "British Columbia",
  "Saskatchewan",
  "Manitoba",
  "Ontario",
  "Quebec",
  "New Brunswick",
  "Nova Scotia",
  "Prince Edward Island",
  "Newfoundland and Labrador",
  "Yukon",
  "Northwest Territories",
  "Nunavut",
];

/** Web-search locale from the company's own service area; none when it can't be told. */
function searchLocation(location: string) {
  const region = CANADIAN_REGIONS.find((name) =>
    location.toLowerCase().includes(name.toLowerCase()),
  );
  return region ? { type: "approximate" as const, country: "CA", region } : undefined;
}

function isDirectoryHost(host: string) {
  return BLOCKED_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`));
}

function parseJsonBlock<T>(text: string): T | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as T;
  } catch {
    return null;
  }
}

export async function snapshotSite(
  name: string,
  url: string,
  depth: "full" | "light" = "light",
): Promise<SiteSnapshot> {
  try {
    const audit = await runWebsiteAudit(url, { includeHtml: true });
    const content = audit.html
      ? await crawlSiteContent({ url: audit.finalUrl || url, html: audit.html }, depth).catch(() => null)
      : null;
    return {
      name,
      url: audit.finalUrl || url,
      ok: audit.ok,
      score: audit.score,
      ttfbMs: audit.metrics.ttfbMs,
      https: audit.metrics.https,
      title: audit.seo.title,
      metaDescription: audit.seo.metaDescription,
      h1: audit.seo.h1Text,
      hasJsonLd: audit.seo.hasJsonLd,
      issues: audit.issues.slice(0, 10).map((i) => `${i.severity}: ${i.message}`),
      excerpt: htmlToPlainExcerpt(audit.html || "", 2500),
      pages: content?.pages,
      features: content?.features,
      ctas: content?.ctas,
      prices: content?.prices,
      sections: content?.sections,
      error: audit.error,
    };
  } catch (err) {
    return {
      name,
      url,
      ok: false,
      score: 0,
      ttfbMs: null,
      https: url.startsWith("https"),
      title: null,
      metaDescription: null,
      h1: null,
      hasJsonLd: false,
      issues: [],
      excerpt: "",
      error: err instanceof Error ? err.message : "Could not load site",
    };
  }
}

const OPTIONAL_CHECK_HELP: Record<OptionalCheck, string> = {
  form: "contact or lead form",
  booking: "online appointment booking",
  chat: "website chat",
  sms: "text/SMS link",
  pricing_page: "pricing or packages page",
  prices: "prices published on the site",
  services_page: "services page",
  guarantee: "guarantee or warranty",
  city_pages: "separate city / service-area landing pages",
  city_in_title: "service city in the page title or H1",
  map: "embedded Google map",
  portfolio: "portfolio, projects or case studies page",
  blog: "blog or guides",
  newsletter: "newsletter or email signup",
  video: "YouTube or TikTok channel",
};

const playbookSchema = z.object({
  industry: z.string().describe("Specific industry label, e.g. 'online and in-person consignment auction house' or 'residential HVAC'"),
  location: z.string().describe("Primary service area, e.g. 'Springfield and area, Illinois'"),
  primaryActions: z
    .array(z.string())
    .describe("2-4 button labels a customer in this industry should see everywhere, e.g. 'Bid now', 'Get a quote', 'Book a table'"),
  secondaryActions: z
    .array(z.string())
    .describe("1-4 supporting actions, e.g. 'Consign with us', 'Register to bid', 'Call now'"),
  keyPages: z
    .array(
      z.object({
        label: z.string().describe("Page a strong site in this industry has, e.g. 'Upcoming auctions'"),
        match: z.array(z.string()).describe("1-4 lowercase words that would appear in that page's URL or title"),
      }),
    )
    .describe("4-6 pages that matter most to customers in this industry"),
  notApplicable: z
    .array(z.enum(OPTIONAL_CHECKS))
    .describe("Checklist items that don't fit how customers buy in this industry. Leave out anything that would still help."),
  notes: z.string().describe("2-3 sentences: what wins customers in this industry and what the website must make easy"),
});

/** Features that show the business already uses a checklist item, so it can't be "not applicable". */
const IN_USE: Partial<Record<OptionalCheck, RegExp>> = {
  form: /form\(s\) on the pages read/,
  booking: /^Online booking link/,
  chat: /^Website chat/,
  sms: /^Text\/SMS link/,
  pricing_page: /^Pricing\/packages page/,
  prices: /^Prices published/,
  services_page: /^Services page or section/,
  guarantee: /^Guarantee or warranty/,
  city_pages: /city\/service-area page link/,
  map: /^Embedded Google map/,
  blog: /^Blog\/guides section/,
  newsletter: /^Newsletter/,
  video: /^Social profiles linked:.*\b(YouTube|TikTok)\b/,
};

function cleanPlaybook(raw: z.infer<typeof playbookSchema>, features: string[] = []): IndustryPlaybook {
  const inUse = (check: OptionalCheck) => {
    const pattern = IN_USE[check];
    return Boolean(pattern && features.some((f) => pattern.test(f)));
  };
  const short = (list: string[], max: number) =>
    Array.from(new Set(list.map((s) => s.trim().slice(0, 40)).filter(Boolean))).slice(0, max);
  return {
    primaryActions: short(raw.primaryActions, 4),
    secondaryActions: short(raw.secondaryActions, 4),
    keyPages: raw.keyPages
      .map((p) => ({
        label: p.label.trim().slice(0, 60),
        match: short(p.match.map((m) => m.toLowerCase()), 4),
      }))
      .filter((p) => p.label && p.match.length)
      .slice(0, 6),
    notApplicable: Array.from(new Set(raw.notApplicable)).filter(
      (c) => OPTIONAL_CHECKS.includes(c) && !inUse(c),
    ),
    notes: raw.notes.trim().slice(0, 600),
  };
}

/**
 * Industry, location and the industry playbook (the actions and pages that matter for this kind
 * of business). A saved playbook is reused so scores stay comparable between runs.
 */
export async function inferProfile(input: {
  companyName: string;
  snapshot: SiteSnapshot;
  industry: string;
  location: string;
  notes?: string;
  previous?: { industry?: string; location?: string; playbook?: IndustryPlaybook } | null;
}) {
  const prev = input.previous;
  if (
    prev?.playbook &&
    (!input.industry || input.industry.trim().toLowerCase() === (prev.industry || "").trim().toLowerCase())
  ) {
    return {
      industry: input.industry || prev.industry || "local business",
      location: input.location || prev.location || "their local area",
      playbook: prev.playbook,
      tokens: 0,
    };
  }
  const site = input.snapshot;
  const pages = (site.pages ?? [])
    .map((p) => `Page ${p.url}${p.title ? ` — ${p.title}` : ""}\n${p.text.slice(0, 1200)}`)
    .join("\n\n")
    .slice(0, 6000);
  const openai = openaiClient();
  const result = await generateText({
    model: openai(COMPETITIVE_RESEARCH_MODEL),
    temperature: 0,
    maxOutputTokens: 900,
    output: Output.object({ schema: playbookSchema }),
    prompt: `Work out exactly what kind of business this is, and what a strong website looks like for that specific industry.
Business: ${input.companyName}
URL: ${site.url}
Title: ${site.title || ""}
Meta: ${site.metaDescription || ""}
${input.industry ? `Industry given by the operator (use it): ${input.industry}` : ""}
${input.location ? `Location given by the operator (use it): ${input.location}` : ""}
${input.notes?.trim() ? `Operator notes about this business:\n${input.notes.trim().slice(0, 1500)}` : ""}
Action buttons found on the site: ${site.ctas?.map((c) => `"${c.label}" ×${c.count}`).join(", ") || "none detected"}
Site sections: ${site.sections?.join(", ") || "none detected"}

${pages || `Homepage text: ${site.excerpt.slice(0, 2500)}`}

Be specific to the exact industry, not generic small-business advice. An auction house lives on "Bid now" and upcoming-auction pages, not quote forms. A restaurant lives on menus and reservations, a trades company on quotes and click-to-call.
Primary actions are the conversions this industry depends on, in the words customers expect on the button.
For notApplicable, only pick checklist items that truly don't fit how customers buy here, and never one the site already uses:
${OPTIONAL_CHECKS.map((c) => `- ${c}: ${OPTIONAL_CHECK_HELP[c]}`).join("\n")}
Use only what the site and notes say for the location. If it's unclear, use "their local area".`,
  });
  const output = result.output;
  return {
    industry: input.industry || output?.industry || "local business",
    location: input.location || output?.location || "their local area",
    playbook: output ? cleanPlaybook(output, site.features) : undefined,
    tokens: tokensOf(result.usage),
  };
}

export async function findCompetitors(input: {
  companyName: string;
  companyUrl: string;
  industry: string;
  location: string;
}) {
  const openai = openaiClient();
  const ownHost = prospectHostKey(input.companyUrl);
  const result = await generateText({
    model: openai.responses(COMPETITIVE_RESEARCH_MODEL),
    tools: {
      web_search: openai.tools.webSearch({
        searchContextSize: "medium",
        userLocation: searchLocation(input.location),
      }),
    },
    maxOutputTokens: 1200,
    prompt: `Find the ${MAX_COMPETITORS + 2} strongest direct competitors of "${input.companyName}" (${input.companyUrl}), a ${input.industry} business serving ${input.location}.

Competitors are businesses a customer in ${input.location} would realistically compare against: same service, same area, ranking in local search or the Google map pack. Include well-known regional players as well as strong local independents.
Exclude ${ownHost}, directories, marketplaces, social profiles, and news sites. Only include URLs you saw in search results.

Reply with only JSON:
{"competitors":[{"name":"Business Name","url":"https://example.ca/","why":"one line on why they compete"}]}`,
  });
  const parsed = parseJsonBlock<{ competitors?: Array<{ name?: string; url?: string }> }>(result.text);
  const seen = new Set([ownHost]);
  const competitors: Array<{ name: string; url: string }> = [];
  for (const c of parsed?.competitors ?? []) {
    if (!c.url || !c.name) continue;
    const url = toSiteUrl(c.url);
    const host = prospectHostKey(url);
    if (!host || seen.has(host) || isDirectoryHost(host)) continue;
    seen.add(host);
    competitors.push({ name: c.name.trim().slice(0, 120), url });
    if (competitors.length >= MAX_COMPETITORS) break;
  }
  return { competitors, tokens: tokensOf(result.usage) };
}

/** Off-site signals (Google rating, reviews, listings, social) via web search. */
export async function researchPresence(input: {
  name: string;
  url: string;
  location: string;
}): Promise<{ presence: MarketPresence; tokens: number }> {
  const fallback: MarketPresence = {
    name: input.name,
    url: input.url,
    googleRating: "unknown",
    reviewCount: "unknown",
    listings: [],
    social: [],
    notes: "",
  };
  const verified = placesConfigured()
    ? await findPlaceForSite(input).catch(() => null)
    : null;
  const withGoogle = (p: MarketPresence): MarketPresence =>
    verified && verified.rating != null
      ? {
          ...p,
          googleRating: verified.rating.toFixed(1),
          reviewCount: String(verified.reviewCount ?? 0),
          googleSource: "google",
          googleMapsUrl: verified.mapsUrl ?? undefined,
        }
      : { ...p, googleSource: p.googleRating === "unknown" ? undefined : "web" };
  try {
    const openai = openaiClient();
    const result = await generateText({
      model: openai.responses(COMPETITIVE_RESEARCH_MODEL),
      tools: {
        web_search: openai.tools.webSearch({
          searchContextSize: "low",
          userLocation: searchLocation(input.location),
        }),
      },
      maxOutputTokens: 700,
      prompt: `Research the public online presence of "${input.name}" (${input.url}) in ${input.location}.
Find: Google rating and number of Google reviews, other review sites (HomeStars, Yelp, Facebook, BBB) with ratings, directory listings, active social profiles, and anything notable (awards, years in business, pricing shown, guarantees).
Say "unknown" when you cannot verify something. Do not guess numbers.

Reply with only JSON:
{"googleRating":"4.8 or unknown","reviewCount":"123 or unknown","listings":["HomeStars 4.7 (40 reviews)"],"social":["Facebook","Instagram"],"notes":"short notable facts"}`,
    });
    const parsed = parseJsonBlock<Partial<MarketPresence>>(result.text);
    return {
      presence: withGoogle({
        ...fallback,
        googleRating: String(parsed?.googleRating ?? "unknown"),
        reviewCount: String(parsed?.reviewCount ?? "unknown"),
        listings: Array.isArray(parsed?.listings) ? parsed!.listings!.map(String).slice(0, 8) : [],
        social: Array.isArray(parsed?.social) ? parsed!.social!.map(String).slice(0, 8) : [],
        notes: String(parsed?.notes ?? "").slice(0, 600),
      }),
      tokens: tokensOf(result.usage),
    };
  } catch {
    return { presence: withGoogle(fallback), tokens: 0 };
  }
}

function playbookPromptBlock(inputs: CompetitiveInputs) {
  const book = inputs.playbook;
  if (!book) return "";
  return `## What matters in this industry (${inputs.industry})
${book.notes}
- Main calls to action customers expect: ${book.primaryActions.join(", ") || "n/a"}
- Supporting actions: ${book.secondaryActions.join(", ") || "n/a"}
- Key pages: ${book.keyPages.map((p) => p.label).join(", ") || "n/a"}
- Not scored for this industry: ${book.notApplicable.map((c) => OPTIONAL_CHECK_HELP[c]).join(", ") || "nothing"}
Write the whole analysis for this industry. Every recommendation, SWOT point and action must fit how customers of a ${inputs.industry} business decide and buy. Don't recommend things listed as not scored, and don't fall back on generic advice written for other industries (quote forms, booking calendars, service-area pages) unless this industry really uses them.`;
}

function describeSite(s: SiteSnapshot, p: MarketPresence | undefined) {
  return `### ${s.name} (${s.url})
Website audit score: ${s.ok ? `${s.score}/100` : `could not load (${s.error || "error"})`}
HTTPS: ${s.https ? "yes" : "no"} · Time to first byte: ${s.ttfbMs ?? "n/a"} ms · Structured data: ${s.hasJsonLd ? "yes" : "no"}
Title: ${s.title || "(missing)"}
Meta description: ${s.metaDescription || "(missing)"}
H1: ${s.h1 || "(missing)"}
Audit issues: ${s.issues.join(" | ") || "none flagged"}
Google rating: ${p?.googleRating ?? "unknown"} · Google reviews: ${p?.reviewCount ?? "unknown"}${p?.googleSource === "google" ? " (verified from Google)" : p?.googleSource === "web" ? " (web search estimate)" : ""}
Other listings: ${p?.listings.join("; ") || "none found"}
Social: ${p?.social.join(", ") || "none found"}
Notes: ${p?.notes || "-"}
${siteContentBlock(s)}`;
}

function siteContentBlock(s: SiteSnapshot) {
  const features = s.features?.length
    ? `Already on the site:\n${s.features.map((f) => `- ${f}`).join("\n")}`
    : "Already on the site: (not detected)";
  if (!s.pages?.length) {
    return `${features}\nHomepage text: ${s.excerpt.slice(0, 1800) || "(unavailable)"}`;
  }
  const pages = s.pages
    .map((page) => `#### Page: ${page.url}${page.title ? ` — ${page.title}` : ""}\n${page.text}`)
    .join("\n\n");
  return `${features}\nPages read (${s.pages.length}), on-page copy:\n${pages}`;
}

/**
 * gpt-4.1 rejects a single request whose prompt plus reserved output exceeds
 * this account's 30k tokens-per-minute cap. Keep page copy inside a character
 * budget and reserve fewer output tokens so the report call fits.
 */
const REPORT_MAX_OUTPUT_TOKENS = 6500;
const REPORT_PAGE_CHAR_BUDGET = 36_000;

function trimSnapshotPages(snapshot: SiteSnapshot, charBudget: number): SiteSnapshot {
  if (!snapshot.pages?.length) {
    return { ...snapshot, excerpt: snapshot.excerpt.slice(0, Math.min(charBudget, 1800)) };
  }
  const pages: SiteSnapshot["pages"] = [];
  let left = charBudget;
  for (const page of snapshot.pages) {
    if (left < 400) break;
    const text = page.text.slice(0, left);
    left -= text.length;
    pages.push({ ...page, text });
  }
  return { ...snapshot, pages };
}

function trimForReport(company: SiteSnapshot, competitors: SiteSnapshot[]) {
  const companyBudget = Math.round(REPORT_PAGE_CHAR_BUDGET * 0.62);
  const each = Math.max(
    2200,
    Math.floor((REPORT_PAGE_CHAR_BUDGET - companyBudget) / Math.max(competitors.length, 1)),
  );
  return {
    company: trimSnapshotPages(company, companyBudget),
    competitors: competitors.map((c) => trimSnapshotPages(c, each)),
  };
}

export async function synthesizeReport(input: {
  companyName: string;
  inputs: CompetitiveInputs;
  company: SiteSnapshot;
  competitors: SiteSnapshot[];
  presence: MarketPresence[];
  scorecard: Scorecard;
  changes: ScoreComparison | null;
  checklistUpdated?: boolean;
}): Promise<{ report: StoredCompetitiveReport; tokens: number }> {
  const openai = openaiClient();
  const presenceFor = (url: string) =>
    input.presence.find((p) => prospectHostKey(p.url) === prospectHostKey(url));
  const trimmed = trimForReport(input.company, input.competitors);

  const result = await generateText({
    model: openai(COMPETITIVE_REPORT_MODEL),
    temperature: 0,
    maxOutputTokens: REPORT_MAX_OUTPUT_TOKENS,
    output: Output.object({ schema: competitiveReportSchema }),
    prompt: `You are Kaylev, writing a competitive analysis for one client company. DigiSol is the agency preparing the report. DigiSol is not the company being analyzed.

SUBJECT: ${input.companyName} (${input.company.url}), a ${input.inputs.industry} business serving ${input.inputs.location}.
Write every summary, score explanation, SWOT point, keyword, and action about ${input.companyName} and the competitor sites below. Do not describe DigiSol's services, website, location, stack, or offers as if they belong to ${input.companyName}. Ignore anything you know about DigiSol as a business.

${playbookPromptBlock(input.inputs)}

Use only the data below. Be specific and evidence-based: cite scores, ratings, review counts, titles, and what each site actually says. Where data is "unknown", say so and add it to dataGaps rather than inventing it.

${input.companyName}'s website is below: copy from its homepage and key pages (shortened when the site is long), plus a list of what is already on the site. Treat the "Already on the site" list as complete even when a page's copy was cut.
- Before recommending anything, check that copy and the "Already on the site" list. Never recommend adding something the company already has (for example a pricing page, quote form, FAQ, blog, click-to-call, booking, city pages or structured data).
- Every path listed after "city/service-area page link(s)" is a live landing page. Read those pages. Do not tell the company they are missing a city or service landing page that is already listed, and do not recommend creating one. Suggest a change to that specific page instead.
- An "Online booking link" on that list means booking is already live (including a Google Calendar appointment page). Do not recommend adding booking.
- If something exists but is weaker than a competitor's, recommend a specific improvement: say where it is now (page URL), quote the current wording, and say what to change.
- Score the company from its actual pages, not from its homepage alone.
- The "Calls to action" line counts every action button on the pages read, across the whole site. Judge calls to action from that line, not the homepage alone, and never say a button is missing when it is listed there.
- Competitor pages are shorter samples, so only claim a competitor lacks something when it's clearly absent from what was read.

## Scores (fixed — do not change them)
Scores come from a fixed checklist so they stay consistent between runs. Copy these numbers into the dimensions (in this order) and overallScore, and write evidence that explains them: what earned the points and what is missing.
${scorecardPromptBlock(input.scorecard, input.changes, { checklistUpdated: input.checklistUpdated })}
- If there were improvements since the previous analysis, open the executive summary by naming them and the score change. Never describe an improvement as a weakness.
- Base the action plan on the missing checklist items with the biggest point values and competitor gaps, plus anything else the evidence shows.

The action plan is the most important part. Give 8-12 actions ordered by priority (highest impact for the least effort first, and close the biggest competitor gaps first). Each needs 4-8 concrete steps someone can follow, practical "how to achieve" recommendations (tools, examples, sample wording, what good looks like), a timeframe, an owner (DigiSol for web/SEO/automation work, Client for things only the business can do such as asking for reviews or photos, Kaylev for automated audits, follow-ups and monitoring), and a measurable KPI with a target.

## Published prices
These are the only prices that were printed on the public pages. priceComparison.summary compares them in 3-5 sentences. Use these figures exactly. Never add a price that is not listed here. When a company has no line, say their prices are not published.
${publishedPricesBlock(input.company, input.competitors)}

Keyword opportunities should be local search terms for ${input.inputs.location} that customers of this exact industry type (${input.inputs.industry}) actually search.

## Company
${describeSite(trimmed.company, presenceFor(input.company.url))}

## Competitors
${trimmed.competitors.map((c) => describeSite(c, presenceFor(c.url))).join("\n\n") || "(no competitors could be analysed)"}`,
  });

  if (!result.output) throw new Error("Kaylev could not produce a report. Try again.");
  return {
    report: {
      ...applyScorecard(result.output, input.scorecard),
      priceComparison: {
        summary: result.output.priceComparison.summary,
        rows: priceComparisonRows(input.company, input.competitors),
      },
      scorecard: input.scorecard,
      changes: input.changes,
    },
    tokens: tokensOf(result.usage),
  };
}

function publishedPricesBlock(company: SiteSnapshot, competitors: SiteSnapshot[]) {
  return [company, ...competitors]
    .map((site) => {
      const offers = site.prices ?? [];
      if (!offers.length) return `- ${site.name}: no prices published on the pages read`;
      return `- ${site.name}: ${offers
        .map((offer) => `${offer.label} ${offer.price}${offer.note ? ` (${offer.note})` : ""}`)
        .join("; ")}`;
    })
    .join("\n");
}

function priceComparisonRows(company: SiteSnapshot, competitors: SiteSnapshot[]) {
  const rows: PriceComparisonRow[] = [];
  const add = (site: SiteSnapshot, role: "you" | "competitor") => {
    const offers = site.prices ?? [];
    if (!offers.length) {
      rows.push({
        company: site.name,
        siteUrl: site.url,
        role,
        offer: "Not published",
        price: "Not published",
        note: "",
        source: "",
      });
      return;
    }
    for (const offer of offers) {
      rows.push({
        company: site.name,
        siteUrl: site.url,
        role,
        offer: offer.label,
        price: offer.price,
        note: offer.note,
        source: offer.url,
      });
    }
  };
  add(company, "you");
  for (const competitor of competitors) add(competitor, "competitor");
  return rows;
}
