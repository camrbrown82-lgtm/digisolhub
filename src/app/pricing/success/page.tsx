import type { Metadata } from "next";
import Link from "next/link";
import { AdsPurchaseConversion } from "@/components/AdsLeadConversion";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { createStripeClient, stripeConfigured } from "@/lib/stripe";

export const metadata: Metadata = {
  title: "Payment received | DigiSol",
  description: "Thanks for starting with DigiSol. We will confirm scope shortly.",
  robots: { index: false, follow: false },
};

async function paidCheckout(sessionId: string | undefined) {
  if (!sessionId || !/^cs_[\w]+$/.test(sessionId) || !stripeConfigured()) return null;
  try {
    const session = await createStripeClient().checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid" || session.amount_total == null) return null;
    return {
      value: session.amount_total / 100,
      currency: (session.currency || "cad").toUpperCase(),
      transactionId: session.id,
    };
  } catch {
    return null;
  }
}

export default async function PricingSuccessPage({
  searchParams,
}: {
  searchParams: { session_id?: string };
}) {
  const purchase = await paidCheckout(searchParams.session_id);
  return (
    <>
      {purchase ? <AdsPurchaseConversion {...purchase} /> : null}
      <Navbar />
      <main id="main" className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-400">
            Stripe checkout complete
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
            You&apos;re booked in
          </h1>
          <p className="mt-4 text-zinc-400">
            Payment went through. Cameron will email you to confirm scope,
            timeline, and kickoff for your DigiSol engagement.
          </p>
          {searchParams.session_id ? (
            <p className="mt-3 break-all text-xs text-zinc-600">
              Ref: {searchParams.session_id}
            </p>
          ) : null}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/"
              className="rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              Back to DigiSol
            </Link>
            <Link
              href="/#contact"
              className="rounded-full border border-white/15 px-5 py-2.5 text-sm font-medium text-zinc-200 hover:bg-white/5"
            >
              Contact
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
