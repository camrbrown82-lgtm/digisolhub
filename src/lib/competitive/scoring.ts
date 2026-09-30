import {
  COMPETITIVE_DIMENSIONS,
  type CompetitiveReport,
  type CtaCount,
  type IndustryPlaybook,
  type MarketPresence,
  type OptionalCheck,
  type SiteSnapshot,
} from "@/lib/competitive/schema";

/**
 * Deterministic competitive scoring: every point comes from a yes/no check on
 * data we collected, so the same site always gets the same score and each
 * change on the site shows up as specific points gained or lost.
 */
export const SCORING_VERSION = 2;

export type DimensionKey = (typeof COMPETITIVE_DIMENSIONS)[number]["key"];

export type ScoreCheck = { id: string; label: string; points: number; max: number };

export type DimensionScore = { key: DimensionKey; score: number; checks: ScoreCheck[] };

export type SiteScore = {
  name: string;
  url: string;
  overall: number;
  dimensions: DimensionScore[];
};

export type ScoreChange = {
  dimension: DimensionKey;
  label: string;
  points: number;
};

export type ScoreComparison = {
  previousId: string;
  previousDate: string | null;
  previousOverall: number;
  overallDelta: number;
  dimensionDeltas: Array<{ key: DimensionKey; from: number; to: number }>;
  gained: ScoreChange[];
  lost: ScoreChange[];
};

export type Scorecard = {
  version: number;
  company: SiteScore;
  competitors: SiteScore[];
  competitorOverallAverage: number | null;
  industry?: string;
  playbook?: IndustryPlaybook;
  /** Checklist items left out because they don't fit this industry. */
  notScored?: string[];
};

export type StoredCompetitiveReport = CompetitiveReport & {
  scorecard?: Scorecard;
  changes?: ScoreComparison | null;
};

type Signals = {
  ok: boolean;
  https: boolean;
  ttfbMs: number | null;
  auditScore: number;
  criticalIssues: number;
  warnIssues: number;
  title: string;
  metaDescription: string;
  h1: string;
  hasJsonLd: boolean;
  schemaTypes: string[];
  pricingPage: boolean;
  pricesPublished: boolean;
  forms: number;
  quoteCta: boolean;
  tel: boolean;
  sms: boolean;
  email: boolean;
  booking: boolean;
  faq: boolean;
  testimonials: boolean;
  reviewLink: boolean;
  mapEmbed: boolean;
  chat: boolean;
  newsletter: boolean;
  guarantee: boolean;
  blog: boolean;
  locationPages: number;
  socials: string[];
  pagePaths: string[];
  homepageWords: number;
  servicesSection: boolean;
  googleRating: number | null;
  reviewCount: number | null;
  googleVerified: boolean;
  /** False for runs saved before calls to action were counted. */
  ctaKnown: boolean;
  ctas: CtaCount[];
  pagesRead: number;
  sections: string[];
  pageTitles: string[];
};

const has = (features: string[], prefix: string) => features.some((f) => f.startsWith(prefix));
const after = (features: string[], prefix: string) =>
  features.find((f) => f.startsWith(prefix))?.slice(prefix.length).trim() ?? "";

function parseNumber(raw: string | undefined) {
  const match = (raw ?? "").replace(/,/g, "").match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function signalsFor(site: SiteSnapshot, presence: MarketPresence | undefined): Signals {
  const f = site.features ?? [];
  const issues = site.issues ?? [];
  const pagePaths = (site.pages ?? []).map((p) => {
    try {
      return new URL(p.url).pathname.toLowerCase();
    } catch {
      return "";
    }
  });
  const homepage = site.pages?.[0]?.text ?? site.excerpt ?? "";
  return {
    ok: site.ok,
    https: site.https,
    ttfbMs: site.ttfbMs,
    auditScore: site.ok ? site.score : 0,
    criticalIssues: issues.filter((i) => i.startsWith("critical")).length,
    warnIssues: issues.filter((i) => i.startsWith("warn")).length,
    title: site.title ?? "",
    metaDescription: site.metaDescription ?? "",
    h1: site.h1 ?? "",
    hasJsonLd: site.hasJsonLd,
    schemaTypes: after(f, "Structured data types:")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
    pricingPage: has(f, "Pricing/packages page"),
    pricesPublished: has(f, "Prices published"),
    forms: parseNumber(f.find((x) => /form\(s\) on the pages read/.test(x))) ?? 0,
    quoteCta: has(f, "Quote/estimate request"),
    tel: has(f, "Click-to-call"),
    sms: has(f, "Text/SMS link"),
    email: has(f, "Email link"),
    booking: has(f, "Online booking link"),
    faq: has(f, "FAQ section"),
    testimonials: has(f, "Testimonials"),
    reviewLink: has(f, "Leave-a-Google-review link"),
    mapEmbed: has(f, "Embedded Google map"),
    chat: has(f, "Website chat"),
    newsletter: has(f, "Newsletter/email signup"),
    guarantee: has(f, "Guarantee or warranty"),
    blog: has(f, "Blog/guides section"),
    locationPages: parseNumber(f.find((x) => /city\/service-area page link/.test(x))) ?? 0,
    socials: after(f, "Social profiles linked:")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    pagePaths,
    homepageWords: homepage.split(/\s+/).filter(Boolean).length,
    servicesSection: has(f, "Services page or section") || /^#{1,3} .*\b(services|what we do)\b/im.test(homepage),
    googleRating: parseNumber(presence?.googleRating),
    reviewCount: parseNumber(presence?.reviewCount),
    googleVerified: presence?.googleSource === "google",
    ctaKnown: Array.isArray(site.ctas),
    ctas: site.ctas ?? [],
    pagesRead: Math.max(1, site.pages?.length ?? 1),
    sections: site.sections ?? [],
    pageTitles: (site.pages ?? []).map((p) => p.title.toLowerCase()),
  };
}

const DEFAULT_ACTIONS = ["Get a quote", "Request an estimate", "Book", "Contact us", "Call"];
const FILLER = new Set(["now", "the", "a", "an", "to", "your", "our", "my", "free", "today", "us", "here", "online", "with", "for", "and", "of", "in", "on"]);
const words = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9à-ÿ ]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);

/** "Bid now" matches "Bid Now!" and "Place a bid"; "Get a quote" matches "Get my free quote". */
function matchesAction(label: string, action: string) {
  const need = words(action).filter((w) => !FILLER.has(w));
  if (!need.length) return false;
  const have = words(label);
  return need.every((n) => have.some((h) => h.startsWith(n) || (h.length >= 3 && n.startsWith(h))));
}

function primaryCtaPoints(s: Signals, book: IndustryPlaybook | undefined) {
  if (!s.ctaKnown) return all(s.quoteCta, 20);
  const actions = book?.primaryActions.length ? book.primaryActions : DEFAULT_ACTIONS;
  const hits = s.ctas.filter((c) => actions.some((a) => matchesAction(c.label, a)));
  if (!hits.length) return 0;
  const pages = new Set(hits.flatMap((c) => c.pages)).size;
  const total = hits.reduce((sum, c) => sum + c.count, 0);
  if (s.pagesRead <= 1 || pages >= Math.max(2, Math.ceil(s.pagesRead / 2))) return 20;
  return total >= 3 ? 16 : 12;
}

function keyPagesFound(s: Signals, book: IndustryPlaybook | undefined) {
  const haystack = [...s.sections, ...s.pagePaths, ...s.pageTitles, ...s.ctas.map((c) => c.label.toLowerCase())].join(" ");
  const pages = book?.keyPages ?? [];
  return pages.filter((p) => p.match.some((m) => haystack.includes(m.toLowerCase()))).length;
}

const LOCAL_SCHEMA =
  /LocalBusiness|ProfessionalService|HomeAndConstructionBusiness|Contractor|Plumber|Electrician|HVACBusiness|RoofingContractor|Dentist|MedicalBusiness|AutoRepair|LegalService|AccountingService|Store|Restaurant|RealEstateAgent/i;

type ScoreContext = { place: string; playbook?: IndustryPlaybook; industry: string };

type CheckDef = {
  id: string;
  label: string | ((ctx: ScoreContext) => string);
  max: number;
  points: (s: Signals, place: string, ctx: ScoreContext) => number;
  /** Leave the check out entirely, e.g. when there is no playbook to score against. */
  skip?: (ctx: ScoreContext) => boolean;
};

const all = (ok: unknown, max: number) => (ok ? max : 0);

const RUBRIC: Record<DimensionKey, CheckDef[]> = {
  website: [
    { id: "loads", label: "Website loads", max: 20, points: (s) => all(s.ok, 20) },
    { id: "https", label: "Served over HTTPS", max: 15, points: (s) => all(s.https, 15) },
    { id: "no_critical", label: "No critical audit issues", max: 25, points: (s) => all(s.ok && s.criticalIssues === 0, 25) },
    { id: "few_warnings", label: "Two or fewer audit warnings", max: 15, points: (s) => all(s.ok && s.warnIssues <= 2, 15) },
    {
      id: "fast",
      label: "Server responds in under 1.5 seconds",
      max: 15,
      points: (s) => all(s.ttfbMs != null && s.ttfbMs < 1500, 15),
    },
    { id: "audit_80", label: "Website audit score 80+", max: 10, points: (s) => all(s.auditScore >= 80, 10) },
  ],
  onpage_seo: [
    { id: "title", label: "Page title", max: 20, points: (s) => all(s.title, 20) },
    { id: "meta", label: "Meta description", max: 20, points: (s) => all(s.metaDescription, 20) },
    { id: "h1", label: "Main heading (H1)", max: 20, points: (s) => all(s.h1, 20) },
    { id: "jsonld", label: "Structured data", max: 20, points: (s) => all(s.hasJsonLd, 20) },
    {
      id: "org_schema",
      label: "Business or organization schema",
      max: 10,
      points: (s) => all(s.schemaTypes.some((t) => /Organization|LocalBusiness/i.test(t) || LOCAL_SCHEMA.test(t)), 10),
    },
    { id: "faq_schema", label: "FAQ schema", max: 10, points: (s) => all(s.schemaTypes.includes("FAQPage"), 10) },
  ],
  local_seo: [
    {
      id: "city_pages",
      label: "City / service-area pages (3+ for full points)",
      max: 25,
      points: (s) => (s.locationPages >= 3 ? 25 : s.locationPages >= 1 ? 12 : 0),
    },
    {
      id: "city_in_title",
      label: "Service city named in the title or H1",
      max: 15,
      points: (s, place) => all(place && new RegExp(`\\b${place}\\b`, "i").test(`${s.title} ${s.h1}`), 15),
    },
    {
      id: "local_schema",
      label: "Local business schema",
      max: 15,
      points: (s) => all(s.schemaTypes.some((t) => LOCAL_SCHEMA.test(t)), 15),
    },
    { id: "map", label: "Embedded Google map", max: 10, points: (s) => all(s.mapEmbed, 10) },
    {
      id: "gbp",
      label: "Google Business Profile found with a rating",
      max: 20,
      points: (s) => all(s.googleRating != null, 20),
    },
    { id: "review_link", label: "Leave-a-Google-review link on the site", max: 15, points: (s) => all(s.reviewLink, 15) },
  ],
  reviews: [
    {
      id: "rating",
      label: "Google rating (4.5+ full, 4.0+ partial)",
      max: 30,
      points: (s) => (s.googleRating == null ? 0 : s.googleRating >= 4.5 ? 30 : s.googleRating >= 4 ? 20 : 10),
    },
    {
      id: "review_count",
      label: "Number of Google reviews (100+ for full points)",
      max: 40,
      points: (s) => {
        const n = s.reviewCount ?? 0;
        return n >= 100 ? 40 : n >= 50 ? 32 : n >= 25 ? 24 : n >= 10 ? 16 : n >= 1 ? 8 : 0;
      },
    },
    { id: "testimonials", label: "Testimonials shown on the site", max: 15, points: (s) => all(s.testimonials, 15) },
    { id: "review_link", label: "Leave-a-Google-review link on the site", max: 15, points: (s) => all(s.reviewLink, 15) },
  ],
  content: [
    {
      id: "industry_pages",
      label: ({ playbook }) =>
        `Key pages for this industry (${(playbook?.keyPages ?? []).map((p) => p.label).join(", ")})`,
      max: 30,
      skip: ({ playbook }) => !playbook?.keyPages.length,
      points: (s, _place, ctx) => {
        const total = ctx.playbook?.keyPages.length ?? 0;
        return total ? Math.round((keyPagesFound(s, ctx.playbook) / total) * 30) : 0;
      },
    },
    { id: "blog", label: "Blog or guides section", max: 30, points: (s) => all(s.blog, 30) },
    { id: "faq", label: "FAQ section", max: 20, points: (s) => all(s.faq, 20) },
    {
      id: "key_pages",
      label: "Key pages found (6+ for full points)",
      max: 20,
      points: (s) => (s.pagePaths.length >= 6 ? 20 : s.pagePaths.length >= 3 ? 10 : 0),
    },
    {
      id: "depth",
      label: "Homepage has 800+ words of copy",
      max: 15,
      points: (s) => all(s.homepageWords >= 800, 15),
    },
    {
      id: "portfolio",
      label: "Portfolio, projects or case studies page",
      max: 15,
      points: (s) => all(s.pagePaths.some((p) => /portfolio|our-work|projects?|case-stud|gallery|media/.test(p)), 15),
    },
  ],
  offer: [
    { id: "pricing_page", label: "Pricing or packages page", max: 30, points: (s) => all(s.pricingPage, 30) },
    { id: "prices", label: "Prices published", max: 25, points: (s) => all(s.pricesPublished, 25) },
    {
      id: "services_page",
      label: "Services page or section",
      max: 15,
      points: (s) => all(s.servicesSection || s.pagePaths.some((p) => /service|what-we-do|solutions/.test(p)), 15),
    },
    {
      id: "clear_h1",
      label: "Clear headline (H1 of 3+ words)",
      max: 10,
      points: (s) => all(s.h1.split(/\s+/).filter(Boolean).length >= 3, 10),
    },
    { id: "guarantee", label: "Guarantee or warranty", max: 20, points: (s) => all(s.guarantee, 20) },
  ],
  conversion: [
    {
      id: "primary_cta",
      label: ({ playbook }) =>
        `Main call to action for this industry (${(playbook?.primaryActions.length ? playbook.primaryActions : DEFAULT_ACTIONS).join(" / ")}) on most pages`,
      max: 25,
      points: (s, _place, ctx) => Math.round((primaryCtaPoints(s, ctx.playbook) / 20) * 25),
    },
    {
      id: "cta_variety",
      label: "3+ different calls to action across the site",
      max: 10,
      points: (s) => (s.ctas.length >= 3 ? 10 : s.ctas.length >= 1 ? 5 : 0),
    },
    { id: "form", label: "Contact or lead form", max: 15, points: (s) => all(s.forms > 0, 15) },
    { id: "tel", label: "Click-to-call phone link", max: 15, points: (s) => all(s.tel, 15) },
    { id: "booking", label: "Online booking", max: 15, points: (s) => all(s.booking, 15) },
    { id: "chat", label: "Website chat", max: 15, points: (s) => all(s.chat, 15) },
    { id: "sms", label: "Text / SMS link", max: 10, points: (s) => all(s.sms, 10) },
    { id: "email", label: "Email link", max: 5, points: (s) => all(s.email, 5) },
  ],
  social: [
    {
      id: "profiles",
      label: "Social profiles linked from the site (14 points each, up to 5)",
      max: 70,
      points: (s) => Math.min(s.socials.length, 5) * 14,
    },
    {
      id: "video",
      label: "Video channel linked (YouTube or TikTok)",
      max: 15,
      points: (s) => all(s.socials.some((n) => n === "YouTube" || n === "TikTok"), 15),
    },
    { id: "newsletter", label: "Newsletter or email signup", max: 15, points: (s) => all(s.newsletter, 15) },
  ],
  trust: [
    { id: "https", label: "Served over HTTPS", max: 10, points: (s) => all(s.https, 10) },
    { id: "testimonials", label: "Testimonials shown on the site", max: 20, points: (s) => all(s.testimonials, 20) },
    { id: "guarantee", label: "Guarantee or warranty", max: 15, points: (s) => all(s.guarantee, 15) },
    {
      id: "proven_rating",
      label: "Google rating 4.5+ with 10+ reviews",
      max: 20,
      points: (s) => all((s.googleRating ?? 0) >= 4.5 && (s.reviewCount ?? 0) >= 10, 20),
    },
    {
      id: "about",
      label: "About page",
      max: 15,
      points: (s) => all(s.pagePaths.some((p) => /about|team|story|who-we/.test(p)), 15),
    },
    { id: "phone", label: "Phone number linked", max: 10, points: (s) => all(s.tel, 10) },
    { id: "email", label: "Email address linked", max: 10, points: (s) => all(s.email, 10) },
  ],
};

/** First place name from "Airdrie and Calgary, Alberta" → "Airdrie". */
function primaryPlace(location: string) {
  const first = location.split(/,| and |\/|&/i)[0]?.trim() ?? "";
  return first.replace(/[^A-Za-zÀ-ÿ' -]/g, "").trim();
}

function activeChecks(key: DimensionKey, ctx: ScoreContext) {
  const skipped = new Set<string>(ctx.playbook?.notApplicable ?? []);
  return RUBRIC[key].filter((c) => !skipped.has(c.id) && !c.skip?.(ctx));
}

/** Labels of checklist items left out for this industry. */
export function notScoredLabels(playbook: IndustryPlaybook | undefined) {
  const skipped = new Set<string>(playbook?.notApplicable ?? []);
  const ctx: ScoreContext = { place: "", playbook, industry: "" };
  const labels = Object.values(RUBRIC)
    .flat()
    .filter((c) => skipped.has(c.id as OptionalCheck))
    .map((c) => (typeof c.label === "function" ? c.label(ctx) : c.label));
  return Array.from(new Set(labels));
}

export function scoreSite(
  site: SiteSnapshot,
  presence: MarketPresence | undefined,
  location: string,
  opts: { playbook?: IndustryPlaybook; industry?: string } = {},
): SiteScore {
  const signals = signalsFor(site, presence);
  const place = primaryPlace(location);
  const ctx: ScoreContext = { place, playbook: opts.playbook, industry: opts.industry ?? "" };
  const dimensions = COMPETITIVE_DIMENSIONS.map(({ key }) => {
    const checks = activeChecks(key, ctx).map((c) => ({
      id: c.id,
      label: typeof c.label === "function" ? c.label(ctx) : c.label,
      max: c.max,
      points: Math.min(c.max, Math.max(0, c.points(signals, place, ctx))),
    }));
    const max = checks.reduce((sum, c) => sum + c.max, 0);
    const got = checks.reduce((sum, c) => sum + c.points, 0);
    return { key, score: max ? Math.round((got / max) * 100) : 0, checks };
  });
  const overall = Math.round(dimensions.reduce((sum, d) => sum + d.score, 0) / dimensions.length);
  return { name: site.name, url: site.url, overall, dimensions };
}

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return url;
  }
};

export function buildScorecard(input: {
  company: SiteSnapshot;
  competitors: SiteSnapshot[];
  presence: MarketPresence[];
  location: string;
  industry?: string;
  playbook?: IndustryPlaybook;
}): Scorecard {
  const presenceFor = (url: string) => input.presence.find((p) => hostOf(p.url) === hostOf(url));
  const opts = { playbook: input.playbook, industry: input.industry };
  const company = scoreSite(input.company, presenceFor(input.company.url), input.location, opts);
  const competitors = input.competitors
    .filter((c) => c.ok)
    .map((c) => scoreSite(c, presenceFor(c.url), input.location, opts));
  return {
    version: SCORING_VERSION,
    company,
    competitors,
    competitorOverallAverage: competitors.length
      ? Math.round(competitors.reduce((sum, c) => sum + c.overall, 0) / competitors.length)
      : null,
    industry: input.industry,
    playbook: input.playbook,
    notScored: notScoredLabels(input.playbook),
  };
}

function positionFor(card: Scorecard): CompetitiveReport["position"] {
  const own = card.company.overall;
  if (!card.competitors.length) {
    return own >= 80 ? "leader" : own >= 65 ? "contender" : own >= 50 ? "challenger" : "behind";
  }
  const best = Math.max(...card.competitors.map((c) => c.overall));
  const avg = card.competitorOverallAverage ?? 0;
  if (own >= best) return "leader";
  if (own >= avg) return "contender";
  if (own >= avg - 10) return "challenger";
  return "behind";
}

/** Replace the model's numbers with the checklist scores; keep its written evidence. */
export function applyScorecard(report: CompetitiveReport, card: Scorecard): CompetitiveReport {
  const evidenceFor = new Map(report.dimensions.map((d) => [d.key, d.evidence]));
  const dimensions = card.company.dimensions.map((d) => {
    const label = COMPETITIVE_DIMENSIONS.find((x) => x.key === d.key)?.label ?? d.key;
    const theirs = card.competitors.map((c) => ({
      name: c.name,
      score: c.dimensions.find((x) => x.key === d.key)?.score ?? 0,
    }));
    const avg = theirs.length ? Math.round(theirs.reduce((sum, c) => sum + c.score, 0) / theirs.length) : 0;
    const best = theirs.reduce<{ name: string; score: number } | null>(
      (top, c) => (!top || c.score > top.score ? c : top),
      null,
    );
    const gap = d.score - avg;
    return {
      key: d.key,
      label,
      companyScore: d.score,
      competitorAverage: avg,
      bestCompetitor: best?.name ?? "—",
      verdict: (!theirs.length ? "parity" : gap >= 8 ? "strength" : gap <= -8 ? "weakness" : "parity") as
        | "strength"
        | "weakness"
        | "parity",
      evidence: evidenceFor.get(d.key) ?? "",
    };
  });
  return { ...report, overallScore: card.company.overall, position: positionFor(card), dimensions };
}

export function compareScores(
  current: SiteScore,
  previous: SiteScore,
  meta: { previousId: string; previousDate: string | null },
): ScoreComparison {
  const gained: ScoreChange[] = [];
  const lost: ScoreChange[] = [];
  const dimensionDeltas = current.dimensions.map((d) => {
    const before = previous.dimensions.find((p) => p.key === d.key);
    for (const check of d.checks) {
      const prior = before?.checks.find((c) => c.id === check.id)?.points ?? 0;
      const diff = check.points - prior;
      if (diff > 0) gained.push({ dimension: d.key, label: check.label, points: diff });
      if (diff < 0) lost.push({ dimension: d.key, label: check.label, points: -diff });
    }
    return { key: d.key, from: before?.score ?? 0, to: d.score };
  });
  return {
    ...meta,
    previousOverall: previous.overall,
    overallDelta: current.overall - previous.overall,
    dimensionDeltas,
    gained,
    lost,
  };
}

/** Plain-text scorecard for the report prompt so the written analysis matches the numbers. */
export function scorecardPromptBlock(
  card: Scorecard,
  changes: ScoreComparison | null,
  opts: { checklistUpdated?: boolean } = {},
) {
  const lines = card.company.dimensions.map((d) => {
    const label = COMPETITIVE_DIMENSIONS.find((x) => x.key === d.key)?.label ?? d.key;
    const missing = d.checks.filter((c) => c.points < c.max).map((c) => c.label);
    const theirs = card.competitors.map((c) => `${c.name} ${c.dimensions.find((x) => x.key === d.key)?.score ?? 0}`);
    return `- ${d.key} (${label}): company ${d.score}; competitors ${theirs.join(", ") || "n/a"}; missing: ${missing.join("; ") || "nothing"}`;
  });
  const changeLines = changes
    ? [
        `Since the previous analysis (${changes.previousDate?.slice(0, 10) ?? "earlier"}), the overall score went from ${changes.previousOverall} to ${card.company.overall}.`,
        changes.gained.length
          ? `Improvements: ${changes.gained.map((g) => `${g.label} (+${g.points}, ${g.dimension})`).join("; ")}`
          : "Improvements: none detected.",
        changes.lost.length
          ? `Regressions: ${changes.lost.map((g) => `${g.label} (-${g.points}, ${g.dimension})`).join("; ")}`
          : "Regressions: none.",
      ]
    : [
        opts.checklistUpdated
          ? "The checklist was updated for this industry since the last analysis, so these scores are not comparable to earlier runs. Don't describe differences from earlier reports as improvements or regressions."
          : "This is the first analysis for this company.",
      ];
  const notScored = card.notScored?.length
    ? [`Not scored because it doesn't fit this industry: ${card.notScored.join("; ")}.`]
    : [];
  return `Overall: company ${card.company.overall}${card.competitorOverallAverage != null ? `, competitor average ${card.competitorOverallAverage}` : ""}.
${lines.join("\n")}
${[...notScored, ...changeLines].join("\n")}`;
}
