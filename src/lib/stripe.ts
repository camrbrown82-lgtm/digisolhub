import Stripe from "stripe";
import { ALBERTA_GST_PERCENT } from "@/lib/pricing";

const GST_TAX_RATE_META = "alberta_gst_5";

export function getStripeSecretKey() {
  return (
    process.env.STRIPE_SECRET_KEY?.trim() ||
    process.env.STRIPE_API_KEY?.trim() ||
    // Stripe Marketplace / Vercel integration sometimes injects this alias
    process.env.STRIPE_SECRET?.trim() ||
    ""
  );
}

export function stripeConfigured() {
  return Boolean(getStripeSecretKey());
}

export function createStripeClient() {
  const key = getStripeSecretKey();
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return new Stripe(key, {
    apiVersion: "2026-08-26.dahlia",
  });
}

export function siteOrigin() {
  return (
    process.env.SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    "https://wwwdigisol.com"
  ).replace(/\/$/, "");
}

/** Exclusive 5% GST tax rate for Alberta Checkout (manual rate, not Stripe Tax auto). */
export async function getAlbertaGstTaxRateId(stripe: Stripe) {
  const fromEnv = process.env.STRIPE_TAX_RATE_GST_AB?.trim();
  if (fromEnv) return fromEnv;

  const existing = await stripe.taxRates.list({ active: true, limit: 100 });
  const match = existing.data.find(
    (rate) =>
      rate.metadata?.digisol === GST_TAX_RATE_META ||
      (rate.percentage === ALBERTA_GST_PERCENT &&
        rate.inclusive === false &&
        /^gst$/i.test(rate.display_name)),
  );
  if (match) return match.id;

  const created = await stripe.taxRates.create({
    display_name: "GST",
    description: "Canada GST · Alberta (5%)",
    percentage: ALBERTA_GST_PERCENT,
    inclusive: false,
    country: "CA",
    jurisdiction: "Alberta",
    tax_type: "gst",
    metadata: { digisol: GST_TAX_RATE_META },
  });
  return created.id;
}
