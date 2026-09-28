/**
 * DigiSol scalable pricing — industry-agnostic packages + add-ons.
 * Amounts are CAD cents for Stripe Checkout.
 */

export type PricingKind = "one_time" | "recurring";

export type PricingItem = {
  id: string;
  name: string;
  blurb: string;
  kind: PricingKind;
  /** CAD cents */
  amount: number;
  interval?: "month";
  includes: string[];
  /** Shown as starting / popular etc. */
  badge?: string;
  featured?: boolean;
  /** Typical kickoff-to-launch time for website packages. */
  timeline?: string;
};

/** DigiSol Hub — shown first; can be bought alone (no website package required). */
export const PRICING_HUB: PricingItem[] = [
  {
    id: "addon_hub",
    name: "DigiSol Hub",
    blurb:
      "CRM, nurture workflows, audit follow-ups, and campaign results — for teams that already have a site (or want Hub before a rebuild).",
    kind: "one_time",
    amount: 750_00,
    badge: "Start with Hub",
    featured: true,
    includes: [
      "Dedicated company workspace in DigiSol Hub",
      "Lead capture + pipeline seed",
      "Email / nurture workflows",
      "Audit follow-ups & campaign monitoring",
      "Tracking snippet for your existing site",
    ],
  },
];

/** Core website engagement tiers — optional when buying Hub alone. */
export const PRICING_PACKAGES: PricingItem[] = [
  {
    id: "foundation",
    name: "Foundation",
    blurb:
      "Custom website design and Next.js build for any Alberta industry — retail, trades, professional services, hospitality, and more.",
    kind: "one_time",
    amount: 4500_00,
    badge: "Start here",
    timeline: "2–3 weeks",
    includes: [
      "Brand-led website design (not a template)",
      "Next.js build · up to 6 core pages",
      "Mobile-first, fast Core Web Vitals",
      "Contact forms + lead capture into DigiSol Hub",
      "GA4 + first-party tracking setup",
      "NAP-consistent local business schema",
    ],
  },
  {
    id: "growth",
    name: "Growth Engine",
    blurb:
      "Foundation plus local SEO, CRO, and Hub automation so nearby customers find you and convert — scales to any service area.",
    kind: "one_time",
    amount: 7500_00,
    badge: "Most booked",
    featured: true,
    timeline: "4–5 weeks",
    includes: [
      "Everything in Foundation",
      "Google Business Profile + citation base",
      "On-page + off-page local SEO starter",
      "Conversion paths (CTAs, forms, thank-you)",
      "Email / nurture workflow in DigiSol Hub",
      "City / service landing page starter set",
    ],
  },
  {
    id: "full_funnel",
    name: "Full Funnel",
    blurb:
      "Design, engineering, local SEO, and paid media under one roof — for companies ready to own their market.",
    kind: "one_time",
    amount: 12000_00,
    badge: "Scale",
    timeline: "6–8 weeks",
    includes: [
      "Everything in Growth Engine",
      "Google Ads + Meta campaign architecture",
      "Landing pages tuned for paid traffic",
      "Campaign monitoring dashboard in Hub",
      "Monthly Dispatch-style content kickoff",
      "Quarterly strategy review",
    ],
  },
];

/** Monthly retainers — stack with a package or run alone after launch. */
export const PRICING_RETAINERS: PricingItem[] = [
  {
    id: "retainer_local",
    name: "Local Growth retainer",
    blurb: "Ongoing SEO, listings, reviews coaching, and Hub workflows.",
    kind: "recurring",
    amount: 1200_00,
    interval: "month",
    includes: [
      "Local SEO + citation hygiene",
      "GBP posts / photo cadence guidance",
      "Workflow & lead follow-up tuning",
      "Monthly performance notes",
    ],
  },
  {
    id: "retainer_ads",
    name: "Paid media retainer",
    blurb: "Google + Meta management on top of your site (ad spend separate).",
    kind: "recurring",
    amount: 1800_00,
    interval: "month",
    includes: [
      "Campaign build & optimization",
      "Creative testing notes",
      "Budget pacing & reporting",
      "Landing page CRO tweaks",
    ],
  },
  {
    id: "retainer_full",
    name: "Full growth retainer",
    blurb: "Local SEO + paid media + content/export pack in one monthly engine.",
    kind: "recurring",
    amount: 2800_00,
    interval: "month",
    featured: true,
    badge: "Best scale",
    includes: [
      "Everything in Local + Paid retainers",
      "AI posters / social export pack",
      "Dispatch-style off-page content",
      "Priority Hub support",
    ],
  },
];

/** Modular add-ons — scale the engagement to the industry and scope. */
export const PRICING_ADDONS: PricingItem[] = [
  {
    id: "addon_pages",
    name: "Extra page pack (×3)",
    blurb: "Three additional designed pages (services, cities, or offers).",
    kind: "one_time",
    amount: 900_00,
    includes: ["3 custom pages", "SEO titles & schema", "Wired into nav"],
  },
  {
    id: "addon_city",
    name: "City landing pack (×4)",
    blurb: "Four local SEO city pages for Alberta markets you serve.",
    kind: "one_time",
    amount: 1600_00,
    includes: ["4 city landers", "Internal linking", "Sitemap + schema"],
  },
  {
    id: "addon_ecommerce",
    name: "E-commerce / catalog module",
    blurb: "Product or booking catalog layered on your DigiSol site.",
    kind: "one_time",
    amount: 3500_00,
    includes: ["Catalog UX", "Checkout handoff", "Inventory-ready structure"],
  },
  {
    id: "addon_custom_app",
    name: "Custom web app module",
    blurb: "Portals, auctions, dashboards, or industry-specific tools.",
    kind: "one_time",
    amount: 5500_00,
    includes: ["Scoped MVP build", "Auth & roles as needed", "Hub-ready data hooks"],
  },
  {
    id: "addon_brand",
    name: "Brand kit refresh",
    blurb: "Logo lockups, colors, voice — stamped across site and Hub.",
    kind: "one_time",
    amount: 1200_00,
    includes: ["Logo / color kit", "Voice notes", "Poster-ready assets"],
  },
];

export const ALL_PRICING_ITEMS = [
  ...PRICING_HUB,
  ...PRICING_PACKAGES,
  ...PRICING_RETAINERS,
  ...PRICING_ADDONS,
] as const;

export const CORE_PACKAGE_IDS = PRICING_PACKAGES.map((item) => item.id);

export function getPricingItem(id: string) {
  return ALL_PRICING_ITEMS.find((item) => item.id === id) ?? null;
}

/** Alberta charges federal GST only (no PST). Listed prices are before tax. */
export const ALBERTA_GST_PERCENT = 5;
export const ALBERTA_GST_RATE = ALBERTA_GST_PERCENT / 100;

export function gstCents(amountCents: number) {
  return Math.round(amountCents * ALBERTA_GST_RATE);
}

export function formatCad(cents: number, fractionDigits = 0, intlLocale = "en-CA") {
  return new Intl.NumberFormat(intlLocale, {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(cents / 100);
}

export const LAUNCH_PROMO = {
  code: "LAUNCH",
  /** Website build + design packages. */
  buildPercent: 20,
  /** Hub, add-ons, and the first month of any retainer. */
  otherPercent: 10,
  /** Mountain time (MDT, UTC-6). Runs Oct 2 through Oct 31. */
  startsAt: "2026-10-02T00:00:00-06:00",
  endsAt: "2026-11-01T00:00:00-06:00",
  startLabel: "October 2",
  endLabel: "October 31",
} as const;

export type PromoCode = typeof LAUNCH_PROMO.code;

export function launchPromoStatus(now = new Date()): "upcoming" | "active" | "ended" {
  if (now < new Date(LAUNCH_PROMO.startsAt)) return "upcoming";
  if (now >= new Date(LAUNCH_PROMO.endsAt)) return "ended";
  return "active";
}

/** Returns the code only when it matches and the promo window is open. */
export function normalizePromoCode(raw?: string | null, now = new Date()): PromoCode | null {
  return raw?.trim().toUpperCase() === LAUNCH_PROMO.code && launchPromoStatus(now) === "active"
    ? LAUNCH_PROMO.code
    : null;
}

export function promoCodeError(raw: string, now = new Date()): string | null {
  const value = raw.trim();
  if (!value) return null;
  if (value.toUpperCase() !== LAUNCH_PROMO.code) {
    return `"${value.slice(0, 40)}" isn't a valid promo code.`;
  }
  const status = launchPromoStatus(now);
  if (status === "upcoming") return `${LAUNCH_PROMO.code} starts ${LAUNCH_PROMO.startLabel}.`;
  if (status === "ended") return `${LAUNCH_PROMO.code} ended ${LAUNCH_PROMO.endLabel}.`;
  return null;
}

/** Percent off for one item under a promo; retainers get it on the first month only. */
export function promoPercentFor(item: PricingItem, promo: PromoCode | null) {
  if (!promo) return 0;
  return CORE_PACKAGE_IDS.includes(item.id)
    ? LAUNCH_PROMO.buildPercent
    : LAUNCH_PROMO.otherPercent;
}

export function promoDiscountCents(item: PricingItem, promo: PromoCode | null) {
  return Math.round((item.amount * promoPercentFor(item, promo)) / 100);
}

export function summarizeSelection(ids: string[], promoCode?: string | null) {
  const promo = normalizePromoCode(promoCode);
  const items = ids
    .map((id) => getPricingItem(id))
    .filter((item): item is PricingItem => Boolean(item));
  const oneTimeItems = items.filter((item) => item.kind === "one_time");
  const recurringItems = items.filter((item) => item.kind === "recurring");
  const oneTimeBase = oneTimeItems.reduce((sum, item) => sum + item.amount, 0);
  const oneTimeDiscount = oneTimeItems.reduce(
    (sum, item) => sum + promoDiscountCents(item, promo),
    0,
  );
  const oneTime = oneTimeBase - oneTimeDiscount;
  const monthly = recurringItems.reduce((sum, item) => sum + item.amount, 0);
  const firstMonthDiscount = recurringItems.reduce(
    (sum, item) => sum + promoDiscountCents(item, promo),
    0,
  );
  const firstMonth = monthly - firstMonthDiscount;
  const oneTimeGst = gstCents(oneTime);
  const monthlyGst = gstCents(monthly);
  const firstMonthGst = gstCents(firstMonth);
  return {
    items,
    promo,
    oneTimeBase,
    oneTimeDiscount,
    oneTime,
    monthly,
    firstMonthDiscount,
    firstMonth,
    oneTimeGst,
    monthlyGst,
    firstMonthGst,
    oneTimeTotal: oneTime + oneTimeGst,
    monthlyTotal: monthly + monthlyGst,
    firstMonthTotal: firstMonth + firstMonthGst,
  };
}
