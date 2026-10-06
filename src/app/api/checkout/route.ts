import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { DEFAULT_LOCALE, isLocale, localizePath } from "@/lib/i18n/config";
import {
  getPricingItem,
  normalizePromoCode,
  promoCodeError,
  summarizeSelection,
} from "@/lib/pricing";
import { ensureStripePrice } from "@/lib/stripeCatalog";
import {
  createStripeClient,
  getAlbertaGstTaxRateId,
  siteOrigin,
  stripeConfigured,
} from "@/lib/stripe";

function checkoutIntegrationId() {
  const alphabet = "abcdefghijklmnopqrstuvwxyz";
  const bytes = randomBytes(8);
  let suffix = "";
  for (let i = 0; i < bytes.length; i++) suffix += alphabet[bytes[i] % 26];
  return `digisol_pricing_${suffix}`;
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!stripeConfigured()) {
    return NextResponse.json(
      {
        error:
          "Stripe is not connected yet. Accept the Stripe Marketplace terms on Vercel (or set STRIPE_SECRET_KEY), then try again — or book a consult below.",
      },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    itemIds?: string[];
    email?: string;
    company?: string;
    industry?: string;
    notes?: string;
    promoCode?: string;
    locale?: string;
  } | null;
  const requestedLocale = body?.locale;
  const locale = isLocale(requestedLocale) ? requestedLocale : DEFAULT_LOCALE;
  const french = locale === "fr";

  const rawPromo = body?.promoCode?.trim() || "";
  const promoError = promoCodeError(rawPromo);
  if (promoError) {
    return NextResponse.json({ error: promoError }, { status: 400 });
  }
  const promo = normalizePromoCode(rawPromo);

  const ids = Array.isArray(body?.itemIds)
    ? body!.itemIds.filter((id) => typeof id === "string")
    : [];
  const unique = Array.from(new Set(ids));
  if (unique.length === 0) {
    return NextResponse.json(
      { error: "Select at least one package or add-on." },
      { status: 400 },
    );
  }

  const { items, oneTimeDiscount, firstMonthDiscount } = summarizeSelection(unique, promo);
  if (items.length === 0) {
    return NextResponse.json({ error: "Unknown pricing selection." }, { status: 400 });
  }

  // Prefer a single core website package if several were sent.
  // Hub-only checkouts (addon_hub without foundation/growth/full_funnel) are allowed.
  const packages = items.filter((item) =>
    ["foundation", "growth", "full_funnel"].includes(item.id),
  );
  if (packages.length > 1) {
    return NextResponse.json(
      { error: "Choose one core package, then stack retainers and add-ons." },
      { status: 400 },
    );
  }

  const stripe = createStripeClient();
  const origin = siteOrigin();
  const gstTaxRateId = await getAlbertaGstTaxRateId(stripe);
  const line_items = await Promise.all(
    items.map(async (item) => ({
      quantity: 1,
      tax_rates: [gstTaxRateId],
      price: await ensureStripePrice(stripe, item),
    })),
  );

  const discountCents = oneTimeDiscount + firstMonthDiscount;
  // One coupon per Checkout. A once amount-off covers the package discount and
  // the retainer's first month; later retainer invoices bill the full price.
  const promoCoupon =
    promo && discountCents > 0
      ? await stripe.coupons.create({
          name: (french ? `Rabais ${promo}` : `${promo} discount`).slice(0, 40),
          amount_off: discountCents,
          currency: "cad",
          duration: "once",
          max_redemptions: 1,
          redeem_by: Math.floor(Date.now() / 1000) + 2 * 24 * 60 * 60,
          metadata: {
            promo_code: promo,
            digisol_items: unique.join(","),
            one_time_discount: String(oneTimeDiscount),
            first_month_discount: String(firstMonthDiscount),
          },
        })
      : null;

  const subscription = items.some((item) => item.kind === "recurring");
  const company = (body?.company || "").slice(0, 120);
  const metadata = {
    digisol_items: unique.join(","),
    digisol_names: items.map((item) => item.name).join(", ").slice(0, 450),
    company,
    industry: (body?.industry || "").slice(0, 80),
    notes: (body?.notes || "").slice(0, 400),
    source: "wwwdigisol.com",
    tax: "alberta_gst_5",
    promo_code: promo || "",
    language: locale,
  };

  const session = await stripe.checkout.sessions.create({
    mode: subscription ? "subscription" : "payment",
    line_items,
    integration_identifier: checkoutIntegrationId(),
    success_url: `${origin}${localizePath("/pricing/success", locale)}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}${localizePath("/pricing", locale)}?cancelled=1${promo ? `&promo=${promo}` : ""}`,
    customer_email: body?.email?.trim() || undefined,
    locale: french ? "fr-CA" : "en",
    ...(promoCoupon
      ? { discounts: [{ coupon: promoCoupon.id }] }
      : { allow_promotion_codes: true }),
    ...(subscription
      ? {
          subscription_data: {
            description: items
              .filter((item) => item.kind === "recurring")
              .map((item) => item.name)
              .join(", ")
              .slice(0, 500),
            metadata: {
              digisol_items: metadata.digisol_items,
              company,
              source: metadata.source,
              promo_code: metadata.promo_code,
            },
          },
        }
      : {
          customer_creation: "always",
          invoice_creation: { enabled: true },
        }),
    billing_address_collection: "required",
    phone_number_collection: { enabled: true },
    metadata,
    custom_text: {
      submit: {
        message: french
          ? "Les prix excluent la TPS de 5 % (Alberta). DigiSol confirme la portée du projet après le paiement."
          : "Prices exclude 5% GST (Alberta). DigiSol confirms scope after checkout.",
      },
    },
  });

  if (!session.url) {
    return NextResponse.json(
      { error: "Stripe did not return a checkout URL." },
      { status: 502 },
    );
  }

  return NextResponse.json({ url: session.url, id: session.id });
}

export async function GET() {
  return NextResponse.json({
    configured: stripeConfigured(),
    catalog: ["foundation", "growth", "full_funnel"].map((id) => getPricingItem(id)?.name),
  });
}
