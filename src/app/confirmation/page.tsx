import type { Metadata } from "next";
import { CheckCircle2, Mail, Phone } from "lucide-react";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { TrackedLink } from "@/components/TrackedLink";

export const metadata: Metadata = {
  title: "Confirmation | DigiSol",
  description:
    "Your DigiSol consultation request has been received. We will follow up shortly.",
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: "/confirmation",
  },
};

export default function ConfirmationPage() {
  return (
    <>
      <Navbar />
      <main id="main" className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 text-center backdrop-blur-md sm:p-12">
          <CheckCircle2
            className="mx-auto h-14 w-14 text-indigo-400"
            aria-hidden="true"
          />
          <h1 className="mt-6 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Confirmation
          </h1>
          <p className="mt-4 text-lg text-zinc-200">
            Your consultation request is booked.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            Thanks for reaching out. Cameron will follow up at the email you
            provided, typically within one business day.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 text-sm text-zinc-300">
            <TrackedLink
              href="tel:+15875770782"
              eventName="contact_click"
              eventParams={{ method: "phone", location: "confirmation" }}
              className="inline-flex items-center gap-2 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
            >
              <Phone className="h-4 w-4 text-indigo-400" aria-hidden="true" />
              1-587-577-0782
            </TrackedLink>
            <TrackedLink
              href="mailto:cam.r.brown82@gmail.com"
              eventName="contact_click"
              eventParams={{ method: "email_gmail", location: "confirmation" }}
              className="inline-flex items-center gap-2 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
            >
              <Mail className="h-4 w-4 text-indigo-400" aria-hidden="true" />
              cam.r.brown82@gmail.com
            </TrackedLink>
          </div>
          <TrackedLink
            href="/"
            eventName="cta_click"
            eventParams={{ cta_name: "back_home", location: "confirmation" }}
            className="mt-10 inline-flex items-center justify-center rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
          >
            Back to DigiSol
          </TrackedLink>
        </div>
      </main>
      <Footer />
    </>
  );
}
