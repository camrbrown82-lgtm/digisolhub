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
  COMPETITIVE_DIMENSIONS,
  competitiveReportSchema,
  type CompetitiveInputs,
  type CompetitiveReport,
  type MarketPresence,
  type SiteSnapshot,
} from "@/lib/competitive/schema";

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

/** Fill in industry / location from the company's own homepage when not given. */
export async function inferProfile(input: {
  companyName: string;
  snapshot: SiteSnapshot;
  industry: string;
  location: string;
}) {
  if (input.industry && input.location) {
    return { industry: input.industry, location: input.location, tokens: 0 };
  }
  const openai = openaiClient();
  const result = await generateText({
    model: openai(COMPETITIVE_RESEARCH_MODEL),
    temperature: 0,
    maxOutputTokens: 200,
    output: Output.object({
      schema: z.object({
        industry: z.string().describe("Short industry label, e.g. 'residential HVAC' or 'web design agency'"),
        location: z.string().describe("Primary service area, e.g. 'Airdrie and Calgary, Alberta'"),
      }),
    }),
    prompt: `From this business website, identify its industry and primary service area.
Business: ${input.companyName}
URL: ${input.snapshot.url}
Title: ${input.snapshot.title || ""}
Meta: ${input.snapshot.metaDescription || ""}
Page text: ${input.snapshot.excerpt.slice(0, 2000)}
If the location is unclear, use "Alberta, Canada".`,
  });
  return {
    industry: input.industry || result.output?.industry || "local business",
    location: input.location || result.output?.location || "Alberta, Canada",
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
        userLocation: { type: "approximate", country: "CA", region: "Alberta" },
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
          userLocation: { type: "approximate", country: "CA", region: "Alberta" },
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
  return `${features}\nPages read (${s.pages.length}), exact on-page copy:\n${pages}`;
}

export async function synthesizeReport(input: {
  companyName: string;
  inputs: CompetitiveInputs;
  company: SiteSnapshot;
  competitors: SiteSnapshot[];
  presence: MarketPresence[];
}): Promise<{ report: CompetitiveReport; tokens: number }> {
  const openai = openaiClient();
  const presenceFor = (url: string) =>
    input.presence.find((p) => prospectHostKey(p.url) === prospectHostKey(url));

  const result = await generateText({
    model: openai(COMPETITIVE_REPORT_MODEL),
    temperature: 0.3,
    maxOutputTokens: 9000,
    output: Output.object({ schema: competitiveReportSchema }),
    prompt: `You are Kaylev, DigiSol's growth analyst. Write a comprehensive competitive analysis for ${input.companyName}, a ${input.inputs.industry} business serving ${input.inputs.location}.

Use only the data below. Be specific and evidence-based: cite scores, ratings, review counts, titles, and what each site actually says. Where data is "unknown", say so and add it to dataGaps rather than inventing it.

${input.companyName}'s own website is given in full below: the exact copy of its homepage and key pages, plus a list of what is already on the site. Treat it as the source of truth about what ${input.companyName} already does.
- Before recommending anything, check that copy and the "Already on the site" list. Never recommend adding something the company already has (for example a pricing page, quote form, FAQ, blog, click-to-call, booking, city pages or structured data).
- If something exists but is weaker than a competitor's, recommend a specific improvement: say where it is now (page URL), quote the current wording, and say what to change.
- Score the company from its actual pages, not from its homepage alone.
- Competitor pages are shorter samples, so only claim a competitor lacks something when it's clearly absent from what was read.

Score every dimension 0-100 for the company and as an average across competitors, in this order:
${COMPETITIVE_DIMENSIONS.map((d) => `- ${d.key}: ${d.label}`).join("\n")}

The action plan is the most important part. Give 8-12 actions ordered by priority (highest impact for the least effort first, and close the biggest competitor gaps first). Each needs 4-8 concrete steps someone can follow, practical "how to achieve" recommendations (tools, examples, sample wording, what good looks like), a timeframe, an owner (DigiSol for web/SEO/automation work, Client for things only the business can do such as asking for reviews or photos, Kaylev for automated audits, follow-ups and monitoring), and a measurable KPI with a target.

Keyword opportunities should be local search terms for ${input.inputs.location} that match this industry.

## Company
${describeSite(input.company, presenceFor(input.company.url))}

## Competitors
${input.competitors.map((c) => describeSite(c, presenceFor(c.url))).join("\n\n") || "(no competitors could be analysed)"}`,
  });

  if (!result.output) throw new Error("Kaylev could not produce a report. Try again.");
  return { report: result.output, tokens: tokensOf(result.usage) };
}
