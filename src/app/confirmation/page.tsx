import type { Metadata } from "next";
import { CheckCircle2, Linkedin, Mail, Phone } from "lucide-react";
import { AdsLeadConversion } from "@/components/AdsLeadConversion";
import { MetaLeadConversion } from "@/components/MetaLeadConversion";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { TrackedLink } from "@/components/TrackedLink";
import { localizePath } from "@/lib/i18n/config";
import { getLocale } from "@/lib/i18n/server";
import { getMessages } from "@/lib/i18n/messages";
import { DIGISOL_EMAIL, DIGISOL_LINKEDIN_URL, LINKEDIN_ENABLED } from "@/lib/site";

export function generateMetadata(): Metadata {
  const locale = getLocale();
  const t = getMessages(locale).confirmation;
  return {
    title: t.metaTitle,
    description: t.metaDescription,
    robots: {
      index: false,
      follow: false,
    },
    alternates: {
      canonical: localizePath("/confirmation", locale),
    },
  };
}

export default function ConfirmationPage() {
  const locale = getLocale();
  const t = getMessages(locale).confirmation;
  return (
    <>
      <Navbar />
      <AdsLeadConversion />
      <MetaLeadConversion />
      <main id="main" className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 text-center backdrop-blur-md sm:p-12">
          <CheckCircle2
            className="mx-auto h-14 w-14 text-indigo-400"
            aria-hidden="true"
          />
          <h1 className="mt-6 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            {t.title}
          </h1>
          <p className="mt-4 text-lg text-zinc-200">{t.lead}</p>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">{t.body}</p>
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
              href={`mailto:${DIGISOL_EMAIL}`}
              eventName="contact_click"
              eventParams={{ method: "email", location: "confirmation" }}
              className="inline-flex items-center gap-2 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
            >
              <Mail className="h-4 w-4 text-indigo-400" aria-hidden="true" />
              {DIGISOL_EMAIL}
            </TrackedLink>
            {LINKEDIN_ENABLED ? (
              <TrackedLink
                href={DIGISOL_LINKEDIN_URL}
                eventName="contact_click"
                eventParams={{ method: "linkedin", location: "confirmation" }}
                target="_blank"
                rel="noopener noreferrer me"
                className="inline-flex items-center gap-2 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
              >
                <Linkedin className="h-4 w-4 text-indigo-400" aria-hidden="true" />
                LinkedIn
              </TrackedLink>
            ) : null}
          </div>
          <TrackedLink
            href={localizePath("/", locale)}
            eventName="cta_click"
            eventParams={{ cta_name: "back_home", location: "confirmation" }}
            className="mt-10 inline-flex items-center justify-center rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
          >
            {t.back}
          </TrackedLink>
        </div>
      </main>
      <Footer />
    </>
  );
}
