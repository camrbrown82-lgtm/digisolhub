import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Payment received | DigiSol",
  description: "Thanks for starting with DigiSol. We will confirm scope shortly.",
  robots: { index: false, follow: false },
};

export default function PricingSuccessPage({
  searchParams,
}: {
  searchParams: { session_id?: string };
}) {
  return (
    <>
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
