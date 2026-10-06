import type Stripe from "stripe";
import { sendLeadAlert } from "@/lib/leadAlert";
import { upsertLead } from "@/lib/leads";
import { formatCad } from "@/lib/pricing";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import { createStripeClient } from "@/lib/stripe";

async function alreadyRecorded(email: string, sessionId: string) {
  if (!hasAdminClient() || !email.includes("@")) return false;
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("contacts")
      .select("notes_preview")
      .eq("email", email.toLowerCase())
      .maybeSingle();
    return String(data?.notes_preview ?? "").includes(sessionId);
  } catch (error) {
    console.error("[stripe-webhook] idempotency lookup failed", error instanceof Error ? error.message : error);
    return false;
  }
}

async function customerEmail(stripe: Stripe, customer: string | Stripe.Customer | Stripe.DeletedCustomer | null) {
  const id = typeof customer === "string" ? customer : customer?.id;
  if (!id) return { email: "", name: "" };
  const record = await stripe.customers.retrieve(id);
  if (record.deleted) return { email: "", name: "" };
  return { email: record.email ?? "", name: record.name ?? "" };
}

async function recordPaidCheckout(session: Stripe.Checkout.Session) {
  const email = session.customer_details?.email || session.customer_email || "";
  const name = session.customer_details?.name || "";
  const phone = session.customer_details?.phone || "";
  const company = session.metadata?.company || "";
  const service = session.metadata?.digisol_names || session.metadata?.digisol_items || "";
  const notes = session.metadata?.notes || "";
  const industry = session.metadata?.industry || "";
  const total =
    session.amount_total != null
      ? formatCad(session.amount_total, 2)
      : "an unknown total";
  const marker = `Stripe checkout ${session.id}`;
  if (await alreadyRecorded(email, session.id)) return;

  const message = [
    marker,
    `Paid ${total} ${session.currency?.toUpperCase() || "CAD"}.`,
    service ? `Items: ${service}` : "",
    industry ? `Industry: ${industry}` : "",
    session.metadata?.promo_code ? `Promo: ${session.metadata.promo_code}` : "",
    notes,
  ]
    .filter(Boolean)
    .join("\n");

  let saved = false;
  if (email.includes("@")) {
    try {
      await upsertLead({
        name,
        email,
        phone,
        company,
        service,
        message,
        source: "stripe_checkout",
        tags: ["customer", "stripe"],
        pinHouseClient: true,
      });
      saved = true;
    } catch (error) {
      console.error("[stripe-webhook] lead save failed", error instanceof Error ? error.message : error);
    }
  }

  const alert = await sendLeadAlert({
    sourceLabel: "Stripe Checkout",
    name,
    email,
    phone,
    company,
    service,
    message,
    note: `Paid ${total}. Scope is confirmed after payment.`,
  });
  if (!saved && !alert.ok) {
    throw new Error(alert.message || "Could not record the paid checkout.");
  }
}

async function alertBilling(input: {
  sourceLabel: string;
  note: string;
  email?: string | null;
  name?: string | null;
  service?: string | null;
  message?: string | null;
}) {
  const alert = await sendLeadAlert({
    sourceLabel: input.sourceLabel,
    email: input.email,
    name: input.name,
    service: input.service,
    message: input.message,
    note: input.note,
  });
  if (!alert.ok && alert.message !== "Resend is not configured.") {
    throw new Error(alert.message);
  }
}

/** Fulfill paid checkouts and record retainer lifecycle events. */
export async function handleStripeEvent(event: Stripe.Event) {
  const stripe = createStripeClient();

  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status === "unpaid") return;
    await recordPaidCheckout(session);
    return;
  }

  if (event.type === "checkout.session.async_payment_failed") {
    const session = event.data.object as Stripe.Checkout.Session;
    await alertBilling({
      sourceLabel: "Stripe payment failed",
      email: session.customer_details?.email || session.customer_email,
      name: session.customer_details?.name,
      service: session.metadata?.digisol_names || session.metadata?.digisol_items,
      note: `Checkout ${session.id} did not collect payment.`,
    });
    return;
  }

  if (event.type === "invoice.paid") {
    const invoice = event.data.object as Stripe.Invoice;
    if (invoice.billing_reason !== "subscription_cycle") return;
    const who = await customerEmail(stripe, invoice.customer);
    await alertBilling({
      sourceLabel: "Stripe retainer renewed",
      email: invoice.customer_email || who.email,
      name: who.name,
      note: `Invoice ${invoice.id} paid ${formatCad(invoice.amount_paid, 2)}.`,
    });
    return;
  }

  if (event.type === "invoice.payment_failed") {
    const invoice = event.data.object as Stripe.Invoice;
    const who = await customerEmail(stripe, invoice.customer);
    await alertBilling({
      sourceLabel: "Stripe payment failed",
      email: invoice.customer_email || who.email,
      name: who.name,
      note: `Invoice ${invoice.id} failed. Amount due ${formatCad(invoice.amount_due, 2)}.`,
    });
    return;
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    const who = await customerEmail(stripe, subscription.customer);
    await alertBilling({
      sourceLabel: "Stripe retainer canceled",
      email: who.email,
      name: who.name,
      service: subscription.metadata?.digisol_items,
      note: `Subscription ${subscription.id} ended.`,
    });
  }
}
