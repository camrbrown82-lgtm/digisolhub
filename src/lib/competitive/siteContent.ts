import type { SitePage } from "@/lib/competitive/schema";

const USER_AGENT = "DigiSolHubBot/1.0 (+https://wwwdigisol.com; competitive-analysis)";
const FETCH_TIMEOUT_MS = 8000;

/** Page kinds worth reading, scored by path and link text. */
const PAGE_PRIORITY: Array<[RegExp, number]> = [
  [/pric|package|plans?\b|cost|rates/i, 10],
  [/service|what-we-do|solutions|offer/i, 9],
  [/quote|estimate|contact|book|consult/i, 8],
  [/about|team|story|who-we/i, 7],
  [/review|testimonial|portfolio|our-work|projects?|case-stud|gallery/i, 7],
  [/faq|questions/i, 6],
  [/blog|guides?|news|dispatch|articles|resources/i, 5],
  [/locations?|service-area|areas?-we|cities/i, 4],
];

const SKIP_PATH =
  /\/(hub|api|admin|wp-admin|wp-login|login|signin|account|cart|checkout|privacy|terms|legal|cookie|feed|tag|author)(\/|$)|\.(pdf|jpe?g|png|gif|webp|svg|zip|mp4|xml|txt)$/i;

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  rsquo: "'",
  lsquo: "'",
  rdquo: '"',
  ldquo: '"',
  ndash: "–",
  mdash: "—",
  hellip: "…",
  middot: "·",
  bull: "•",
  copy: "©",
};

function decodeEntities(text: string) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code: string) => {
    if (code[0] === "#") {
      const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : match;
    }
    return ENTITIES[code.toLowerCase()] ?? match;
  });
}

/** Readable page copy with headings and list items kept on their own lines. */
export function htmlToReadableText(html: string, opts: { stripChrome?: boolean } = {}) {
  let body = html
    .replace(/<head[\s\S]*?<\/head>/i, " ")
    .replace(/<(script|style|noscript|svg|template|iframe)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");
  if (opts.stripChrome) {
    body = body.replace(/<(header|nav|footer)\b[\s\S]*?<\/\1>/gi, " ");
  }
  const text = body
    .replace(/<h([1-3])\b[^>]*>([\s\S]*?)<\/h\1>/gi, (_m, level: string, inner: string) =>
      `\n\n${"#".repeat(Number(level))} ${inner.replace(/<[^>]+>/g, " ")}\n`,
    )
    .replace(/<li\b[^>]*>/gi, "\n- ")
    .replace(/<(br|\/p|\/div|\/section|\/article|\/tr|\/h[4-6]|\/summary|\/details|\/button|\/label)\b[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
  return decodeEntities(text)
    .split("\n")
    .map((line) => line.replace(/[ \t\f\v]+/g, " ").trim())
    .filter((line, i, lines) => line && line !== lines[i - 1])
    .join("\n");
}

function titleOf(html: string) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? decodeEntities(match[1].replace(/\s+/g, " ").trim()) : "";
}

type LinkCandidate = { url: string; score: number; kind: number };

const PER_KIND_LIMIT = 2;
/** Pricing, services and quote/contact pages get extra room. */
const KEY_PAGE_WEIGHT = 8;

function candidateLinks(html: string, baseUrl: string): LinkCandidate[] {
  const base = new URL(baseUrl);
  const host = base.hostname.replace(/^www\./, "");
  const chrome = (html.match(/<(header|nav)\b[\s\S]*?<\/\1>/gi) ?? []).join(" ");
  const best = new Map<string, { score: number; kind: number }>();
  for (const match of Array.from(html.matchAll(/<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi))) {
    let url: URL;
    try {
      url = new URL(decodeEntities(match[1]), base);
    } catch {
      continue;
    }
    if (!/^https?:$/.test(url.protocol) || url.hostname.replace(/^www\./, "") !== host) continue;
    url.hash = "";
    url.search = "";
    const path = url.pathname.replace(/\/+$/, "") || "/";
    if (path === "/" || SKIP_PATH.test(path)) continue;
    const label = `${path} ${match[2].replace(/<[^>]+>/g, " ")}`;
    const kind = PAGE_PRIORITY.findIndex(([pattern]) => pattern.test(label));
    if (kind < 0) continue;
    let score = PAGE_PRIORITY[kind][1];
    if (chrome.includes(match[1])) score += 3;
    score -= Math.max(0, path.split("/").filter(Boolean).length - 1) * 3;
    const key = `${url.origin}${path}`;
    const prev = best.get(key);
    if (!prev || score > prev.score) best.set(key, { score, kind });
  }
  const perKind = new Map<number, number>();
  return Array.from(best, ([url, v]) => ({ url, ...v }))
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .filter((c) => {
      const count = perKind.get(c.kind) ?? 0;
      perKind.set(c.kind, count + 1);
      return count < PER_KIND_LIMIT;
    });
}

async function fetchHtml(url: string) {
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
    });
    if (!response.ok || !(response.headers.get("content-type") ?? "").includes("html")) return null;
    return { url: response.url || url, html: await response.text() };
  } catch {
    return null;
  }
}

/** Things already on the site, so the report doesn't recommend adding them. */
function detectFeatures(pages: Array<{ url: string; html: string }>) {
  const html = pages.map((p) => p.html).join("\n");
  const text = htmlToReadableText(html);
  const paths = pages.map((p) => new URL(p.url).pathname);
  const features: string[] = [];
  const add = (ok: unknown, label: string) => {
    if (ok) features.push(label);
  };

  const prices = Array.from(new Set(text.match(/\$\s?\d{1,3}(?:,\d{3})+(?:\.\d{2})?|\$\s?\d{3,}/g) ?? [])).slice(0, 8);
  const pricingPath = paths.find((p) => /pric|package|plans?\b|rates/i.test(p));
  add(pricingPath, `Pricing/packages page (${pricingPath})`);
  add(prices.length, `Prices published on the site: ${prices.join(", ")}`);
  const forms = (html.match(/<form\b/gi) ?? []).length;
  add(forms, `${forms} form(s) on the pages read`);
  add(/<form\b[\s\S]{0,4000}?(quote|estimate)/i.test(html) || /get (a|my) (free )?(quote|estimate)/i.test(text), "Quote/estimate request form or CTA");
  add(/href=["']tel:/i.test(html), "Click-to-call phone link");
  add(/href=["']sms:/i.test(html), "Text/SMS link");
  add(/href=["']mailto:/i.test(html), "Email link");
  add(/calendly\.com|cal\.com\/|acuityscheduling|squareup\.com\/appointments|setmore|booksy|janeapp|housecallpro|jobber/i.test(html), "Online booking link");
  add(/FAQPage|frequently asked|\bFAQs?\b/i.test(html), "FAQ section");
  add(/testimonial|what (our )?(clients|customers) say|client reviews/i.test(text), "Testimonials or client reviews shown on the site");
  add(/search\.google\.com\/local\/writereview|g\.page\/r\/|writereview\?placeid/i.test(html), "Leave-a-Google-review link");
  add(/google\.com\/maps\/embed|maps\.google\.[a-z.]+\/maps\?.*output=embed/i.test(html), "Embedded Google map");
  add(/live chat|chat with|intercom|tawk\.to|driftt?\.com|crisp\.chat|tidio/i.test(html), "Website chat");
  add(/newsletter|subscribe/i.test(text), "Newsletter/email signup");
  add(/guarantee|warranty/i.test(text), "Guarantee or warranty mentioned");
  add(/financing/i.test(text), "Financing mentioned");
  const blogPath = paths.find((p) => /blog|guide|news|dispatch|articles|resources/i.test(p));
  add(blogPath || /href=["'][^"']*\/(blog|guides?|news|articles)\b/i.test(html), `Blog/guides section${blogPath ? ` (${blogPath})` : ""}`);
  const locationLinks = new Set(html.match(/href=["'][^"']*\/(locations?|service-areas?|areas)\/[a-z0-9-]+/gi) ?? []);
  add(locationLinks.size, `${locationLinks.size} city/service-area page link(s)`);

  const socials = [
    ["Facebook", /facebook\.com\//i],
    ["Instagram", /instagram\.com\//i],
    ["LinkedIn", /linkedin\.com\//i],
    ["YouTube", /youtube\.com\//i],
    ["TikTok", /tiktok\.com\//i],
    ["X/Twitter", /(twitter|x)\.com\//i],
  ] as const;
  const linked = socials.filter(([, re]) => re.test(html)).map(([name]) => name);
  add(linked.length, `Social profiles linked: ${linked.join(", ")}`);

  const schemaTypes = new Set<string>();
  for (const block of Array.from(html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi))) {
    for (const t of Array.from(block[1].matchAll(/"@type"\s*:\s*"([^"]+)"/g))) schemaTypes.add(t[1]);
  }
  add(schemaTypes.size, `Structured data types: ${Array.from(schemaTypes).slice(0, 12).join(", ")}`);
  return features;
}

/**
 * Reads the homepage plus the site's key pages (pricing, services, contact, about, reviews,
 * FAQ, blog, locations). `full` is for the company being analysed; `light` for competitors.
 */
export async function crawlSiteContent(
  homepage: { url: string; html: string },
  depth: "full" | "light",
): Promise<{ pages: SitePage[]; features: string[] }> {
  const limits =
    depth === "full"
      ? { extraPages: 10, homeChars: 14000, pageChars: 6000, totalChars: 60000 }
      : { extraPages: 4, homeChars: 3500, pageChars: 1500, totalChars: 9000 };

  const links = candidateLinks(homepage.html, homepage.url).slice(0, limits.extraPages);
  const fetched = await Promise.all(
    links.map(async (link) => {
      const page = await fetchHtml(link.url);
      return page ? { ...page, key: PAGE_PRIORITY[link.kind][1] >= KEY_PAGE_WEIGHT } : null;
    }),
  );
  const homeKey = new URL(homepage.url).pathname.replace(/\/+$/, "");
  const extra = fetched.filter(
    (p, i, all): p is { url: string; html: string; key: boolean } =>
      Boolean(p) &&
      new URL(p!.url).pathname.replace(/\/+$/, "") !== homeKey &&
      all.findIndex((q) => q?.url === p!.url) === i,
  );

  let budget = limits.totalChars;
  const pages: SitePage[] = [];
  const ordered = [{ ...homepage, key: true }, ...extra];
  for (let i = 0; i < ordered.length && budget > 0; i++) {
    const page = ordered[i];
    const pageCap = page.key ? Math.round(limits.pageChars * 1.7) : limits.pageChars;
    const cap = Math.min(budget, i === 0 ? limits.homeChars : pageCap);
    const text = htmlToReadableText(page.html, { stripChrome: i > 0 }).slice(0, cap);
    if (!text) continue;
    budget -= text.length;
    pages.push({ url: page.url, title: titleOf(page.html), text });
  }
  return { pages, features: detectFeatures([homepage, ...extra]) };
}
