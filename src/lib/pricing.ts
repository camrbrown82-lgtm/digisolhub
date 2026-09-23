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
};

/** Core engagement tiers — pick one to start, then stack add-ons. */
export const PRICING_PACKAGES: PricingItem[] = [
  {
    id: "foundation",
    name: "Foundation",
    blurb:
      "Custom website design and Next.js build for any Alberta industry — retail, trades, professional services, hospitality, and more.",
    kind: "one_time",
    amount: 4500_00,
    badge: "Start here",
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
  {
    id: "addon_hub",
    name: "Client Hub workspace",
    blurb: "Dedicated DigiSol Hub company with brand, leads, and analytics.",
    kind: "one_time",
    amount: 750_00,
    includes: ["Company workspace", "Tracking snippet", "Lead pipeline seed"],
  },
];

/**
 * Temporary $2 CAD Stripe live-payment smoke test.
 * Remove from the pricing page once checkout is verified.
 */
export const PRICING_TESTING: PricingItem = {
  id: "testing",
  name: "Testing",
  blurb:
    "Temporary $2 CAD charge to verify live Stripe Checkout. Remove after payment succeeds.",
  kind: "one_time",
  amount: 200,
  badge: "Internal",
  includes: [
    "Live Stripe Checkout smoke test",
    "Alberta GST applied at checkout",
    "Safe to delete after verification",
  ],
};

export const ALL_PRICING_ITEMS = [
  ...PRICING_PACKAGES,
  ...PRICING_RETAINERS,
  ...PRICING_ADDONS,
  PRICING_TESTING,
] as const;

export function getPricingItem(id: string) {
  return ALL_PRICING_ITEMS.find((item) => item.id === id) ?? null;
}

/** Alberta charges federal GST only (no PST). Listed prices are before tax. */
export const ALBERTA_GST_PERCENT = 5;
export const ALBERTA_GST_RATE = ALBERTA_GST_PERCENT / 100;

export function gstCents(amountCents: number) {
  return Math.round(amountCents * ALBERTA_GST_RATE);
}

export function formatCad(cents: number, fractionDigits = 0) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(cents / 100);
}

export function summarizeSelection(ids: string[]) {
  const items = ids
    .map((id) => getPricingItem(id))
    .filter((item): item is PricingItem => Boolean(item));
  const oneTime = items
    .filter((item) => item.kind === "one_time")
    .reduce((sum, item) => sum + item.amount, 0);
  const monthly = items
    .filter((item) => item.kind === "recurring")
    .reduce((sum, item) => sum + item.amount, 0);
  const oneTimeGst = gstCents(oneTime);
  const monthlyGst = gstCents(monthly);
  return {
    items,
    oneTime,
    monthly,
    oneTimeGst,
    monthlyGst,
    oneTimeTotal: oneTime + oneTimeGst,
    monthlyTotal: monthly + monthlyGst,
  };
}
