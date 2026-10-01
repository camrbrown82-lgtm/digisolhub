import type { CtaCount, PriceOffer, SitePage } from "@/lib/competitive/schema";

const USER_AGENT = "DigiSolHubBot/1.0 (+https://wwwdigisol.com; competitive-analysis)";
const FETCH_TIMEOUT_MS = 8000;

/** Page kinds worth reading, scored by path and link text. */
const PAGE_PRIORITY: Array<[RegExp, number]> = [
  [/pric|package|plans?\b|cost|rates/i, 10],
  [
    /\b(auctions?|catalog(ue)?|lots?|live|bid(ding)?|consign(ment)?|sell|buy|shop|store|products?|inventory|listings?|menus?|order|reserv\w*|events?|tickets?|donat\w*|courses?|classes|membership)\b/i,
    9,
  ],
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

const OTHER_KIND = PAGE_PRIORITY.length;
const PER_KIND_LIMIT = 2;
/** Button text that asks the visitor to do something: "Bid now", "Get a quote", "Book online". */
const CTA_LABEL =
  /^(bid|place (a )?bid|buy|shop|order|book|reserve|schedule|register|sign ?up|join|subscribe|get|request|start|call|phone|contact|consign|sell|enter|apply|donate|download|claim|try|view|see|browse|watch|chat|message|text|learn more|find|explore|add to (cart|bag)|check ?out|talk|ask|compare|visit|shop now|preview)\b/i;

function cleanLabel(inner: string) {
  return decodeEntities(inner.replace(/<[^>]+>/g, " "))
    .replace(/[→»›>←«‹<]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.!:]+$/, "");
}
/** Pricing, services and quote/contact pages get extra room. */
const KEY_PAGE_WEIGHT = 8;
const LOCATION_KIND = PAGE_PRIORITY.findIndex(([pattern]) => pattern.test("/locations/calgary"));
const BOOKING_HREF =
  /calendly\.com|cal\.com\/|acuityscheduling|squareup\.com\/appointments|setmore|booksy|janeapp|housecallpro|jobber|calendar\.google\.com\/calendar\/appointments|calendar\.app\.google/i;
const LOCATION_PATH = /\/(locations?|service-areas?|areas)\/[a-z0-9-]+$/i;

function candidateLinks(
  html: string,
  baseUrl: string,
  opts: { locationLimit?: number; perKind?: Map<number, number>; exclude?: Set<string> } = {},
): LinkCandidate[] {
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
    const matched = PAGE_PRIORITY.findIndex(([pattern]) => pattern.test(label));
    const inChrome = chrome.includes(match[1]);
    // Header links and call-to-action buttons lead to the pages the business cares about,
    // whatever they are called.
    const kind = matched >= 0 ? matched : inChrome || CTA_LABEL.test(cleanLabel(match[2])) ? OTHER_KIND : -1;
    if (kind < 0) continue;
    let score = kind === OTHER_KIND ? 4 : PAGE_PRIORITY[kind][1];
    if (inChrome) score += 3;
    if (kind !== LOCATION_KIND) {
      score -= Math.max(0, path.split("/").filter(Boolean).length - 1) * 3;
    }
    const key = `${url.origin}${path}`;
    const prev = best.get(key);
    if (!prev || score > prev.score) best.set(key, { score, kind });
  }
  const perKind = opts.perKind ?? new Map<number, number>();
  return Array.from(best, ([url, v]) => ({ url, ...v }))
    .filter((c) => c.score > 0 && !opts.exclude?.has(c.url))
    .sort((a, b) => b.score - a.score)
    .filter((c) => {
      const count = perKind.get(c.kind) ?? 0;
      perKind.set(c.kind, count + 1);
      const limit = c.kind === LOCATION_KIND ? (opts.locationLimit ?? PER_KIND_LIMIT) : PER_KIND_LIMIT;
      return count < limit;
    });
}

/** Every city or service landing page linked from the page, including ones buried in the footer. */
function locationPageUrls(html: string, baseUrl: string) {
  const base = new URL(baseUrl);
  const host = base.hostname.replace(/^www\./, "");
  const found = new Set<string>();
  for (const match of Array.from(html.matchAll(/href=["']([^"'#]+)["']/gi))) {
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
    if (!LOCATION_PATH.test(path)) continue;
    found.add(`${url.origin}${path}`);
  }
  return Array.from(found);
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

  const pricingPath = paths.find((p) => /pric|package|plans?\b|rates/i.test(p));
  add(pricingPath, `Pricing/packages page (${pricingPath})`);
  add(
    /\bid=["']services["']|href=["'][^"']*[/#]services?\b/i.test(html) ||
      paths.some((p) => /service|what-we-do|solutions/i.test(p)) ||
      /^#{1,3} .*\b(services|what we do)\b/im.test(text),
    "Services page or section",
  );
  const forms = (html.match(/<form\b/gi) ?? []).length;
  add(forms, `${forms} form(s) on the pages read`);
  add(/<form\b[\s\S]{0,4000}?(quote|estimate)/i.test(html) || /get (a|my) (free )?(quote|estimate)/i.test(text), "Quote/estimate request form or CTA");
  add(/href=["']tel:/i.test(html), "Click-to-call phone link");
  add(/href=["']sms:/i.test(html), "Text/SMS link");
  add(/href=["']mailto:/i.test(html), "Email link");
  let bookingUrl = "";
  for (const match of Array.from(html.matchAll(/href=["']([^"']+)["']/gi))) {
    const href = decodeEntities(match[1]);
    if (!BOOKING_HREF.test(href)) continue;
    bookingUrl = href;
    break;
  }
  add(bookingUrl, `Online booking link (${bookingUrl.slice(0, 180)})`);
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
  const locationPaths = Array.from(
    new Set(
      pages.flatMap((page) =>
        locationPageUrls(page.html, page.url).map((url) => new URL(url).pathname.replace(/\/+$/, "")),
      ),
    ),
  ).sort();
  add(
    locationPaths.length,
    `${locationPaths.length} city/service-area page link(s)${locationPaths.length ? `: ${locationPaths.join(", ")}` : ""}`,
  );

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
    for (const t of Array.from(block[1].matchAll(/"@type"\s*:\s*("[^"]+"|\[[^\]]*\])/g))) {
      for (const name of Array.from(t[1].matchAll(/"([^"]+)"/g))) schemaTypes.add(name[1]);
    }
  }
  add(schemaTypes.size, `Structured data types: ${Array.from(schemaTypes).slice(0, 24).join(", ")}`);
  return features;
}

const PRICE_TOKEN =
  /(?:\$\s?\d{1,3}(?:,\d{3})+(?:\.\d{2})?|\$\s?\d{2,}(?:\.\d{2})?|\d{1,3}(?:[ \u00a0]\d{3})+(?:[.,]\d{2})?\s*\$|\d{2,}(?:[.,]\d{2})?\s*\$)(?:\s?(?:\/|per)\s?(?:month|year|hour|week|mo|yr|hr))?/gi;

const RANGE_GAP = /^[\s–—-]*(?:to|and)?[\s–—-]*$/i;

function cleanOfferLabel(raw: string) {
  return raw
    .replace(/^[-•#\s]+/, "")
    .replace(/[:|–—-]\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function skipYearPrice(line: string, price: string) {
  const digits = price.replace(/\D/g, "");
  const year = Number(digits);
  return year >= 1900 && year <= 2099 && digits.length === 4 && /©|copyright|\bsince\b|\bestablished\b/i.test(line);
}

/** Package or service prices printed on the pages, newest pricing page first. */
export function extractPriceOffers(pages: Array<{ url: string; text: string; html?: string }>): PriceOffer[] {
  const offers: PriceOffer[] = [];
  const seen = new Set<string>();
  const add = (offer: PriceOffer) => {
    const label = cleanOfferLabel(offer.label).slice(0, 80);
    const price = offer.price.replace(/\s+/g, " ").trim();
    if (label.length < 2 || !price) return;
    const key = `${label.toLowerCase()}|${price.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    offers.push({ label, price, note: offer.note.replace(/\s+/g, " ").trim().slice(0, 140), url: offer.url });
  };

  for (const page of pages) {
    if (page.html) {
      for (const block of Array.from(page.html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi))) {
        try {
          walkJsonLdPrices(JSON.parse(block[1]) as unknown, page.url, add, 0);
        } catch {
          /* invalid JSON-LD */
        }
      }
    }
    const lines = page.text.split("\n");
    let heading = "";
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/^#{1,3}\s+\S/.test(line)) {
        heading = cleanOfferLabel(line.replace(/^#+\s+/, ""));
        continue;
      }
      const found = Array.from(line.matchAll(PRICE_TOKEN), (match) => ({
        price: match[0],
        index: match.index ?? 0,
      })).filter((match) => !skipYearPrice(line, match.price));
      const groups: Array<{ price: string; index: number; end: number }> = [];
      for (let n = 0; n < found.length; n++) {
        const current = found[n];
        const next = found[n + 1];
        const between = next ? line.slice(current.index + current.price.length, next.index) : "";
        if (next && between.trim() && RANGE_GAP.test(between) && /[–—-]|to|and/i.test(between)) {
          groups.push({
            price: `${current.price.trim()}–${next.price.trim()}`,
            index: current.index,
            end: next.index + next.price.length,
          });
          n += 1;
        } else {
          groups.push({
            price: current.price.trim(),
            index: current.index,
            end: current.index + current.price.length,
          });
        }
      }
      for (const group of groups) {
        const before = cleanOfferLabel(line.slice(0, group.index));
        const after = cleanOfferLabel(line.slice(group.end));
        const nextLine = lines[i + 1] ?? "";
        PRICE_TOKEN.lastIndex = 0;
        const nextHasPrice = PRICE_TOKEN.test(nextLine);
        PRICE_TOKEN.lastIndex = 0;
        const note =
          after.length >= 8 ? after : !nextHasPrice && !/^#{1,3}\s/.test(nextLine) ? cleanOfferLabel(nextLine) : "";
        add({
          label: before.length >= 2 && before.length <= 80 ? before : heading || "Published price",
          price: group.price,
          note,
          url: page.url,
        });
      }
    }
  }

  const pricingFirst = (url: string) => {
    try {
      return /pric|package|plans?\b|rates|cost/i.test(new URL(url).pathname) ? 0 : 1;
    } catch {
      return 1;
    }
  };
  const labeled = offers.filter((offer) => offer.label !== "Published price");
  const pool = labeled.length ? labeled : offers;
  return pool.sort((a, b) => pricingFirst(a.url) - pricingFirst(b.url)).slice(0, 6);
}

function walkJsonLdPrices(
  node: unknown,
  url: string,
  add: (offer: PriceOffer) => void,
  depth: number,
  parentName = "",
) {
  if (!node || depth > 6) return;
  if (Array.isArray(node)) {
    for (const item of node) walkJsonLdPrices(item, url, add, depth + 1, parentName);
    return;
  }
  if (typeof node !== "object") return;
  const obj = node as Record<string, unknown>;
  const name = typeof obj.name === "string" && obj.name.trim() ? obj.name : parentName;
  const low = obj.lowPrice;
  const high = obj.highPrice;
  const raw = obj.price ?? (low != null && high != null ? `${low}–${high}` : low ?? high);
  if ((typeof raw === "string" || typeof raw === "number") && name) {
    const amount = String(raw).trim();
    const currency = typeof obj.priceCurrency === "string" ? obj.priceCurrency : "";
    const price = amount.includes("$") || /[a-z]/i.test(amount) ? amount : currency ? `${amount} ${currency}` : `$${amount}`;
    add({ label: name, price, note: "", url });
  }
  for (const value of Object.values(obj)) {
    if (value && typeof value === "object") walkJsonLdPrices(value, url, add, depth + 1, name);
  }
}

/**
 * Reads the homepage plus the site's key pages (pricing, services, contact, about, reviews,
 * FAQ, blog, locations). `full` is for the company being analysed; `light` for competitors.
 */
export async function crawlSiteContent(
  homepage: { url: string; html: string },
  depth: "full" | "light",
): Promise<{ pages: SitePage[]; features: string[]; ctas: CtaCount[]; sections: string[]; prices: PriceOffer[] }> {
  const limits =
    depth === "full"
      ? { extraPages: 10, homeChars: 14000, pageChars: 6000, totalChars: 80000 }
      : { extraPages: 4, homeChars: 3500, pageChars: 1500, totalChars: 9000 };

  const perKind = new Map<number, number>();
  const ranked = candidateLinks(homepage.html, homepage.url, {
    locationLimit: depth === "full" ? 24 : PER_KIND_LIMIT,
    perKind,
  });
  const homeKey = new URL(homepage.url).pathname.replace(/\/+$/, "");
  const seen = new Set<string>([`${new URL(homepage.url).origin}${homeKey || "/"}`]);
  const unseen = (link: LinkCandidate) => {
    if (seen.has(link.url)) return false;
    seen.add(link.url);
    return true;
  };
  const isKey = (kind: number) => kind !== OTHER_KIND && PAGE_PRIORITY[kind][1] >= KEY_PAGE_WEIGHT;
  const fetchAll = (list: LinkCandidate[]) =>
    Promise.all(
      list.map(async (link) => {
        const page = await fetchHtml(link.url);
        return page ? { ...page, key: isKey(link.kind) } : null;
      }),
    );

  const firstRound = ranked.filter((link) => link.kind !== LOCATION_KIND).slice(0, limits.extraPages).filter(unseen);
  const links = [
    ...firstRound,
    ...ranked.filter((link) => link.kind === LOCATION_KIND),
    ...(depth === "full"
      ? locationPageUrls(homepage.html, homepage.url).map((url) => ({
          url,
          score: 1,
          kind: LOCATION_KIND,
        }))
      : []),
  ].filter((link) => firstRound.includes(link) || unseen(link));
  const fetched = await fetchAll(links);

  // Homepages that are only a doorway ("Enter the auction") keep the real offer one click deeper.
  const room = limits.extraPages - firstRound.length;
  if (depth === "full" && room > 0) {
    const deeperKinds = new Map<number, number>();
    const deeper = fetched
      .filter((page): page is NonNullable<typeof page> => Boolean(page))
      .flatMap((page) => candidateLinks(page.html, page.url, { perKind: deeperKinds, exclude: seen }))
      .filter((link) => link.kind !== LOCATION_KIND)
      .sort((a, b) => b.score - a.score)
      .filter(unseen)
      .slice(0, room);
    fetched.push(...(await fetchAll(deeper)));
  }
  const extra = fetched.filter(
    (p, i, all): p is { url: string; html: string; key: boolean } =>
      Boolean(p) &&
      new URL(p!.url).pathname.replace(/\/+$/, "") !== homeKey &&
      all.findIndex((q) => q?.url === p!.url) === i,
  );

  const isLanding = (url: string) => {
    try {
      return LOCATION_PATH.test(new URL(url).pathname.replace(/\/+$/, ""));
    } catch {
      return false;
    }
  };
  const landings = extra.filter((page) => isLanding(page.url));
  const rest = extra.filter((page) => !isLanding(page.url));

  let budget = limits.totalChars;
  const pages: SitePage[] = [];
  const ordered = [{ ...homepage, key: true }, ...landings, ...rest];
  const pricePages = ordered.map((page, i) => ({
    url: page.url,
    text: htmlToReadableText(page.html, { stripChrome: i > 0 }).slice(0, 20_000),
    html: page.html,
  }));
  for (let i = 0; i < ordered.length && budget > 0; i++) {
    const page = ordered[i];
    const landing = i > 0 && isLanding(page.url);
    const pageCap = landing
      ? Math.min(limits.pageChars, landings.length > 8 ? 2500 : 4000)
      : page.key
        ? Math.round(limits.pageChars * 1.7)
        : limits.pageChars;
    const cap = Math.min(budget, i === 0 ? limits.homeChars : pageCap);
    const text = pricePages[i]?.text.slice(0, cap) ?? "";
    if (!text) continue;
    budget -= text.length;
    pages.push({ url: page.url, title: titleOf(page.html), text });
  }
  const read = [homepage, ...extra];
  const ctas = callsToAction(read);
  const sections = siteSections(read);
  const features = detectFeatures(read);
  const prices = extractPriceOffers(pricePages);
  if (prices.length) {
    features.push(
      `Prices published on the site: ${prices.map((offer) => `${offer.label} ${offer.price}`).join("; ")}`,
    );
  }
  if (ctas.length) {
    features.push(
      `Calls to action on the ${read.length} page(s) read: ${ctas
        .slice(0, 12)
        .map((c) => `"${c.label}" ×${c.count} (${c.pages.length} page${c.pages.length === 1 ? "" : "s"})`)
        .join(", ")}`,
    );
  }
  if (sections.length) features.push(`Site sections linked: ${sections.join(", ")}`);
  return { pages, features, ctas, sections, prices };
}

/** Every action button or link on the pages read, with how often and where it appears. */
function callsToAction(pages: Array<{ url: string; html: string }>): CtaCount[] {
  const found = new Map<string, CtaCount>();
  for (const page of pages) {
    const path = new URL(page.url).pathname || "/";
    const body = page.html
      .replace(/<head[\s\S]*?<\/head>/i, " ")
      .replace(/<(script|style|noscript|template)[\s\S]*?<\/\1>/gi, " ");
    const labels = [
      ...Array.from(body.matchAll(/<(a|button)\b[^>]*>([\s\S]*?)<\/\1>/gi), (m) => m[2]),
      ...Array.from(
        body.matchAll(/<input\b[^>]*type=["'](?:submit|button)["'][^>]*value=["']([^"']+)["']/gi),
        (m) => m[1],
      ),
    ];
    for (const raw of labels) {
      const label = cleanLabel(raw);
      if (!label || label.length > 40 || label.split(" ").length > 6 || !CTA_LABEL.test(label)) continue;
      if (/@|\d{3}[\s.-]?\d{3}[\s.-]?\d{4}/.test(label)) continue;
      const key = label.toLowerCase();
      const entry = found.get(key) ?? { label, count: 0, pages: [] };
      entry.count += 1;
      if (!entry.pages.includes(path)) entry.pages.push(path);
      found.set(key, entry);
    }
  }
  return Array.from(found.values())
    .sort((a, b) => b.pages.length - a.pages.length || b.count - a.count)
    .slice(0, 25);
}

/** Top-level sections the site links to, e.g. /auctions, /consign, /faq. */
function siteSections(pages: Array<{ url: string; html: string }>) {
  const host = new URL(pages[0].url).hostname.replace(/^www\./, "");
  const found = new Set<string>();
  for (const page of pages) {
    for (const match of Array.from(page.html.matchAll(/<a\b[^>]*href=["']([^"'#]+)["']/gi))) {
      let url: URL;
      try {
        url = new URL(decodeEntities(match[1]), page.url);
      } catch {
        continue;
      }
      if (!/^https?:$/.test(url.protocol) || url.hostname.replace(/^www\./, "") !== host) continue;
      const segment = url.pathname.split("/").filter(Boolean)[0];
      if (!segment || segment.startsWith("_") || SKIP_PATH.test(`/${segment}`)) continue;
      found.add(`/${segment.toLowerCase()}`);
    }
  }
  return Array.from(found).sort().slice(0, 30);
}
