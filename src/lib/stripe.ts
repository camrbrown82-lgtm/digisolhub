import Stripe from "stripe";

export function getStripeSecretKey() {
  return (
    process.env.STRIPE_SECRET_KEY?.trim() ||
    process.env.STRIPE_API_KEY?.trim() ||
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
