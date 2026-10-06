import { publishedSiteExcerpt } from "@/lib/competitive/siteContent";
import { LAUNCH_PROMO, launchPromoStatus, PRICING_PACKAGES } from "@/lib/pricing";
import { DIGISOL_SITE_URL } from "@/lib/site";
import { companySiteUrl, isDigisolClient } from "@/lib/workspace";

const CACHE_MS = 10 * 60 * 1000;
const cache = new Map<string, { at: number; text: string }>();

/**
 * The offer the public DigiSol site is showing right now.
 * Same source as the launch bar and the pricing page.
 */
export function digisolPublishedFacts() {
  const status = launchPromoStatus();
  const packages = PRICING_PACKAGES.map((item) => item.name).join(", ");
  const pricing = `${DIGISOL_SITE_URL}/pricing`;
  if (status === "upcoming") {
    return `The launch offer is not open yet. It starts ${LAUNCH_PROMO.startLabel}. Do not advertise code ${LAUNCH_PROMO.code} as available. Pricing page: ${pricing}`;
  }
  if (status === "ended") {
    return `The launch offer ended ${LAUNCH_PROMO.endLabel}. Do not advertise code ${LAUNCH_PROMO.code}. Pricing page: ${pricing}`;
  }
  return [
    `Live on every public DigiSol page and on ${pricing}:`,
    `Launch offer · code ${LAUNCH_PROMO.code}. ${LAUNCH_PROMO.startLabel} to ${LAUNCH_PROMO.endLabel}.`,
    `${LAUNCH_PROMO.buildPercent}% off website build and design (${packages}).`,
    `${LAUNCH_PROMO.otherPercent}% off everything else: the Hub, add-ons, and the first month of any retainer.`,
    `Link that applies the code: ${pricing}?promo=${LAUNCH_PROMO.code}`,
  ].join(" ");
}

/** Prompt block: quote this company's published pages, never another company's offer. */
export function publishedFactsRule(facts: string) {
  return `## Published on this company's own site
${facts}
When asked for the discount, promo, or offer on the site, use these facts exactly: the code, percents, dates, and link. Do not invent a different percent, code, date, or price. Never use another company's offer.`;
}

/** DigiSol uses the live catalog. Every other company is read from its own website. */
export async function companyPublishedFacts(
  client: { name?: string | null; domain?: string | null } | null | undefined,
) {
  const name = client?.name?.trim() || "this company";
  if (isDigisolClient(client)) {
    return publishedFactsRule(
      `These facts are what wwwdigisol.com publishes right now.\n${digisolPublishedFacts()}`,
    );
  }
  const site = companySiteUrl(client);
  if (!site) {
    return publishedFactsRule(
      `No public website is on file for ${name}. Use only the brief and this company's brand kit. Never use DigiSol's launch code, percents, or prices.`,
    );
  }
  const hit = cache.get(site);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.text;
  const excerpt = await Promise.race([
    publishedSiteExcerpt(site),
    new Promise<string>((resolve) => setTimeout(() => resolve(""), 12000)),
  ]);
  const text = publishedFactsRule(
    excerpt
      ? `Published pages for ${name} (${site}) only. This is not DigiSol. Never mention DigiSol, code LAUNCH, or DigiSol's discounts unless that exact offer appears in the pages below.\n${excerpt}`
      : `Could not read ${site} just now. Use only the brief and this company's brand kit. Never use DigiSol's launch code or prices.`,
  );
  cache.set(site, { at: Date.now(), text });
  return text;
}
