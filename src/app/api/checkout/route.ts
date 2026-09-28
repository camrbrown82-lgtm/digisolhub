import { NextResponse } from "next/server";
import {
  LAUNCH_PROMO,
  getPricingItem,
  normalizePromoCode,
  promoCodeError,
  promoDiscountCents,
  promoPercentFor,
  summarizeSelection,
} from "@/lib/pricing";
import {
  createStripeClient,
  getAlbertaGstTaxRateId,
  siteOrigin,
  stripeConfigured,
} from "@/lib/stripe";

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
  } | null;

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

  const { items, firstMonthDiscount } = summarizeSelection(unique, promo);
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
  const line_items = items.map((item) => {
    const oneTimePromo = item.kind === "one_time" ? promoPercentFor(item, promo) : 0;
    return {
      quantity: 1,
      tax_rates: [gstTaxRateId],
      price_data: {
        currency: "cad",
        tax_behavior: "exclusive" as const,
        product_data: {
          name: oneTimePromo ? `${item.name} (${promo} ${oneTimePromo}% off)` : item.name,
          description: item.blurb.slice(0, 450),
          metadata: { digisol_id: item.id },
        },
        unit_amount:
          item.kind === "one_time" ? item.amount - promoDiscountCents(item, promo) : item.amount,
        ...(item.kind === "recurring"
          ? { recurring: { interval: "month" as const } }
          : {}),
      },
    };
  });

  // Checkout allows one discount per session, so retainers' first-month promo
  // is a single-use fixed-amount coupon; one-time items are discounted above.
  const firstMonthCoupon =
    promo && firstMonthDiscount > 0
      ? await stripe.coupons.create({
          name: `${promo}: ${LAUNCH_PROMO.otherPercent}% off first month`,
          amount_off: firstMonthDiscount,
          currency: "cad",
          duration: "once",
          max_redemptions: 1,
          redeem_by: Math.floor(Date.now() / 1000) + 2 * 24 * 60 * 60,
          metadata: { promo_code: promo, digisol_items: unique.join(",") },
        })
      : null;

  const session = await stripe.checkout.sessions.create({
    mode: items.some((item) => item.kind === "recurring") ? "subscription" : "payment",
    line_items,
    success_url: `${origin}/pricing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/pricing?cancelled=1${promo ? `&promo=${promo}` : ""}`,
    customer_email: body?.email?.trim() || undefined,
    ...(firstMonthCoupon
      ? { discounts: [{ coupon: firstMonthCoupon.id }] }
      : promo
        ? {}
        : { allow_promotion_codes: true }),
    billing_address_collection: "required",
    phone_number_collection: { enabled: true },
    metadata: {
      digisol_items: unique.join(","),
      company: (body?.company || "").slice(0, 120),
      industry: (body?.industry || "").slice(0, 80),
      notes: (body?.notes || "").slice(0, 400),
      source: "wwwdigisol.com",
      tax: "alberta_gst_5",
      promo_code: promo || "",
    },
    custom_text: {
      submit: {
        message:
          "Prices exclude 5% GST (Alberta). DigiSol confirms scope after checkout.",
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
