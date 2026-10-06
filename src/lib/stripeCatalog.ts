import Stripe from "stripe";
import { ALL_PRICING_ITEMS, type PricingItem } from "@/lib/pricing";
import { DIGISOL_SITE_URL } from "@/lib/site";

const PRICING_URL = `${DIGISOL_SITE_URL}/pricing`;

/** Stable product ids so checkout and the Stripe catalog stay the same object. */
export function stripeProductId(itemId: string) {
  return `digisol_${itemId}`;
}

function statementDescriptor(item: PricingItem) {
  if (item.id === "retainer_local") return "DIGISOL LOCAL";
  if (item.id === "retainer_ads") return "DIGISOL ADS";
  if (item.id === "retainer_full") return "DIGISOL GROWTH";
  return undefined;
}

function marketingFeatures(item: PricingItem) {
  return item.includes.slice(0, 15).map((name) => ({ name: name.slice(0, 80) }));
}

function priceMatches(price: Stripe.Price, item: PricingItem) {
  if (!price.active || price.currency !== "cad" || price.unit_amount !== item.amount) return false;
  const behavior = price.tax_behavior;
  if (behavior && behavior !== "exclusive" && behavior !== "unspecified") return false;
  if (item.kind === "recurring") {
    return price.recurring?.interval === "month" && (price.recurring.interval_count ?? 1) === 1;
  }
  return !price.recurring;
}

function expandedPrice(product: Stripe.Product) {
  const price = product.default_price;
  return price && typeof price !== "string" ? price : null;
}

function isStripeError(error: unknown): error is Stripe.errors.StripeInvalidRequestError {
  return error instanceof Stripe.errors.StripeInvalidRequestError;
}

async function retrieveProduct(stripe: Stripe, id: string) {
  try {
    return await stripe.products.retrieve(id, { expand: ["default_price"] });
  } catch (error) {
    if (isStripeError(error) && error.code === "resource_missing") return null;
    throw error;
  }
}

function priceData(item: PricingItem): Stripe.ProductCreateParams.DefaultPriceData {
  return {
    currency: "cad",
    unit_amount: item.amount,
    tax_behavior: "exclusive",
    metadata: { digisol_id: item.id },
    ...(item.kind === "recurring" ? { recurring: { interval: "month" as const } } : {}),
  };
}

async function createProduct(stripe: Stripe, item: PricingItem) {
  const descriptor = statementDescriptor(item);
  try {
    return await stripe.products.create({
      id: stripeProductId(item.id),
      name: item.name,
      description: item.blurb.slice(0, 500),
      active: true,
      url: PRICING_URL,
      metadata: { digisol_id: item.id },
      marketing_features: marketingFeatures(item),
      ...(descriptor ? { statement_descriptor: descriptor } : {}),
      default_price_data: priceData(item),
      expand: ["default_price"],
    });
  } catch (error) {
    if (isStripeError(error) && error.code === "resource_already_exists") {
      const existing = await retrieveProduct(stripe, stripeProductId(item.id));
      if (existing) return existing;
    }
    throw error;
  }
}

async function syncProductCopy(stripe: Stripe, product: Stripe.Product, item: PricingItem) {
  const descriptor = statementDescriptor(item) ?? null;
  const description = item.blurb.slice(0, 500);
  const nextFeatures = marketingFeatures(item).map((feature) => feature.name).join("|");
  const currentFeatures = (product.marketing_features ?? []).map((feature) => feature.name ?? "").join("|");
  if (
    product.name === item.name &&
    (product.description ?? "") === description &&
    (product.statement_descriptor ?? null) === descriptor &&
    currentFeatures === nextFeatures &&
    product.metadata?.digisol_id === item.id
  ) {
    return;
  }
  await stripe.products.update(product.id, {
    name: item.name,
    description,
    metadata: { digisol_id: item.id },
    marketing_features: marketingFeatures(item),
    ...(descriptor ? { statement_descriptor: descriptor } : {}),
  });
}

async function ensurePriceId(stripe: Stripe, product: Stripe.Product, item: PricingItem) {
  const current = expandedPrice(product);
  if (current && priceMatches(current, item)) return current.id;

  const created = await stripe.prices.create({
    product: product.id,
    currency: "cad",
    unit_amount: item.amount,
    tax_behavior: "exclusive",
    metadata: { digisol_id: item.id },
    ...(item.kind === "recurring" ? { recurring: { interval: "month" as const } } : {}),
  });
  await stripe.products.update(product.id, { default_price: created.id });
  if (current?.active) {
    await stripe.prices.update(current.id, { active: false });
  }
  return created.id;
}

/** Create or reuse the live Price for one catalog item. */
export async function ensureStripePrice(stripe: Stripe, item: PricingItem) {
  const existing = await retrieveProduct(stripe, stripeProductId(item.id));
  const product = existing ?? (await createProduct(stripe, item));
  if (existing) await syncProductCopy(stripe, product, item);
  return ensurePriceId(stripe, product, item);
}

/** Sync every published package, retainer, and add-on. */
export async function ensureStripeCatalog(stripe: Stripe) {
  const prices = new Map<string, string>();
  for (const item of ALL_PRICING_ITEMS) {
    prices.set(item.id, await ensureStripePrice(stripe, item));
  }
  return prices;
}
