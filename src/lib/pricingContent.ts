import {
  ALBERTA_GST_PERCENT,
  PRICING_HUB,
  PRICING_PACKAGES,
  PRICING_RETAINERS,
  formatCad,
  getPricingItem,
} from "@/lib/pricing";
import { DIGISOL_GUARANTEES, GUARANTEE_FINE_PRINT } from "@/lib/guarantee";

const price = (id: string) => formatCad(getPricingItem(id)?.amount ?? 0);
const timeline = (id: string) => getPricingItem(id)?.timeline ?? "";

/** Lowest website package price, e.g. "$4,500" (en-CA) or "4 500 $" (fr-CA). */
export function pricingFrom(intlLocale = "en-CA") {
  return formatCad(Math.min(...PRICING_PACKAGES.map((item) => item.amount)), 0, intlLocale);
}

export const PRICING_FROM = pricingFrom();

export const PRICING_VALUE_POINTS = [
  {
    title: "Custom design, never a template",
    body: "Designed around your brand and your customers, then built as a fast Next.js site. No page builders, no theme everyone else is using.",
  },
  {
    title: "Live in weeks, not months",
    body: `Foundation typically launches in ${timeline("foundation")} and Growth Engine in ${timeline("growth")}. Your timeline is confirmed in writing before we start.`,
  },
  {
    title: "Leads tracked from day one",
    body: "Every form feeds the DigiSol Hub, with instant lead alerts, follow-up emails and analytics that show what's working.",
  },
  {
    title: "Prices published up front",
    body: `Canadian dollars, plus ${ALBERTA_GST_PERCENT}% GST. Pay in full at checkout, or 50% up front and 50% at launch.`,
  },
];

type Cell = boolean | string;

/** Rows for the package comparison table, in Foundation / Growth Engine / Full Funnel order. */
export const PACKAGE_COMPARISON: { label: string; cells: [Cell, Cell, Cell] }[] = [
  { label: "Typical launch", cells: PRICING_PACKAGES.map((p) => p.timeline ?? "") as [Cell, Cell, Cell] },
  { label: "Custom design (not a template)", cells: [true, true, true] },
  { label: "Core pages", cells: ["Up to 6", "Up to 6", "Up to 6"] },
  { label: "Mobile-first, fast-loading build", cells: [true, true, true] },
  { label: "Forms and lead capture into DigiSol Hub", cells: [true, true, true] },
  { label: "Google Analytics and conversion tracking", cells: [true, true, true] },
  { label: "Local business schema", cells: [true, true, true] },
  { label: "City or service landing pages", cells: [false, "Starter set", "Starter set"] },
  { label: "Google Business Profile and citations", cells: [false, true, true] },
  { label: "Local SEO starter", cells: [false, true, true] },
  { label: "Conversion paths (CTAs, forms, thank-you pages)", cells: [false, true, true] },
  { label: "Automated email follow-up", cells: [false, true, true] },
  { label: "Google Ads and Meta campaign setup", cells: [false, false, true] },
  { label: "Landing pages for paid traffic", cells: [false, false, true] },
  { label: "Campaign dashboard in Hub", cells: [false, false, true] },
  { label: "Quarterly strategy review", cells: [false, false, true] },
];

/** Typical market ranges from 2026 Calgary and Canadian website pricing guides. */
export const LOCAL_PRICE_COMPARISON = [
  {
    option: "DIY website builder",
    price: "About $20–$75 a month",
    note: "Plus your own time. You pick a template and set it up yourself; SEO, lead tracking and follow-up are up to you.",
  },
  {
    option: "Freelancer or template setup",
    price: "Typically $1,500–$8,000",
    note: "Quality and scope vary a lot. Local SEO, a CRM and ad campaigns are usually extra, or not offered.",
  },
  {
    option: "Full-service agency",
    price: "Typically $10,000–$25,000+",
    note: "For a 4–5 page site. You get a team, but you also pay for their overhead.",
  },
  {
    option: "DigiSol Growth Engine",
    price: `${price("growth")} one-time`,
    note: "Custom design and build, local SEO and Google Business Profile setup, and automated lead follow-up in one published price.",
    highlight: true,
  },
];

const retainerList = PRICING_RETAINERS.map(
  (r) => `${r.name.replace(/ retainer$/i, "")} (${formatCad(r.amount)}/month)`,
).join(", ");

export const PRICING_FAQ: { q: string; a: string }[] = [
  {
    q: "How much does a website cost with DigiSol?",
    a: `Custom websites start at ${price("foundation")} with Foundation. Growth Engine, which adds local SEO and automated follow-up, is ${price("growth")}. Full Funnel, which adds Google and Meta ad setup, is ${price("full_funnel")}. All prices are in Canadian dollars, plus ${ALBERTA_GST_PERCENT}% GST.`,
  },
  {
    q: "Why pay for a custom site instead of a template?",
    a: "A template is built for everyone, so it loads more code than you need and looks like thousands of other sites. We design around your customers and build a fast site that's set up to capture and track leads from day one, so it's built to earn back what it costs.",
  },
  {
    q: "How long does a website take?",
    a: `Typical launch times are ${timeline("foundation")} for Foundation, ${timeline("growth")} for Growth Engine and ${timeline("full_funnel")} for Full Funnel. The clock starts at kickoff, once we have your content, logo and logins, and your timeline is confirmed in writing before we start.`,
  },
  {
    q: "Do you guarantee your work?",
    a: `Yes, in writing. ${DIGISOL_GUARANTEES.map((g) => `${g.title}: ${g.body}`).join(" ")} ${GUARANTEE_FINE_PRINT}`,
  },
  {
    q: "How do I pay?",
    a: `Pay in full by card through secure Stripe checkout on this page, or ask for an invoice to pay 50% up front and 50% at launch. ${ALBERTA_GST_PERCENT}% GST is added at payment.`,
  },
  {
    q: "Are there monthly costs?",
    a: `DigiSol hosts and maintains your site, and that's covered by any monthly retainer: ${retainerList}. Launching without a retainer? Ask about hosting in your quote. Ad spend is paid separately to Google and Meta.`,
  },
  {
    q: "Do I own my domain and content?",
    a: "Yes. Your domain, your written content, your logo and your photos are yours. We host and maintain the site so it stays fast and secure.",
  },
  {
    q: "What happens after I reach out?",
    a: "First, a free consultation about your goals, services and budget. Then you get a written quote with the scope and timeline. We design the site and you approve it before we build. We launch with tracking set up, and you can add a retainer for ongoing SEO, ads and follow-up.",
  },
  {
    q: "Can I start smaller?",
    a: `Yes. If you already have a website, the DigiSol Hub on its own is ${formatCad(PRICING_HUB[0].amount)} and adds lead tracking and follow-up. Extra pages (${price("addon_pages")} for 3) and city pages (${price("addon_city")} for 4) can be added any time.`,
  },
  {
    q: "What if my project doesn't fit a package?",
    a: `Request a free quote and we'll price it. Common add-ons include an e-commerce or booking catalog (${price("addon_ecommerce")}) and a custom web app module for portals or dashboards (${price("addon_custom_app")}).`,
  },
];
