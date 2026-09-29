"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { BrandCard } from "@/components/BrandCard";
import { ContactOptions } from "@/components/ContactOptions";
import { GoogleRating } from "@/components/LocalListings";
import { LocationMap } from "@/components/LocationMap";
import { trackEvent } from "@/lib/analytics";
import { useLocale, useLocalizedHref, useMessages } from "@/lib/i18n/client";
import { submitLead } from "@/lib/leadSubmit";
import { DIGISOL_EMAIL, DIGISOL_PHONE } from "@/lib/site";

const fieldClass =
  "mt-1.5 w-full rounded-lg border border-indigo-400/25 bg-zinc-950/80 px-3 py-2.5 text-sm text-white placeholder:text-zinc-500 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30";

const phoneDisplay = DIGISOL_PHONE.replace("+1-", "1-");

export function Contact({
  title,
  body,
}: {
  title?: string;
  body?: string;
}) {
  const locale = useLocale();
  const localize = useLocalizedHref();
  const messages = useMessages();
  const t = messages.contact;
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setSending(true);

    const form = event.currentTarget;
    const data = new FormData(form);

    const value = (key: string) => String(data.get(key) ?? "");
    try {
      const outcome = await submitLead(
        {
          name: value("fullName"),
          email: value("email"),
          phone: value("phone"),
          company: value("business"),
          service: value("service"),
          message: value("details"),
          language: locale,
          website_url: value("website_url"),
        },
        "contact_form",
      );
      // Flagged pitches skip /confirmation so they never count as an ad conversion.
      if (outcome === "spam") {
        form.reset();
        setNotice(t.received);
        return;
      }
      router.push(localize("/confirmation"));
    } catch (err) {
      const detail = err instanceof Error ? err.message : "";
      setError(
        detail && !/failed to fetch|network/i.test(detail)
          ? detail
          : t.error(DIGISOL_EMAIL, phoneDisplay),
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <section
      id="contact"
      className="border-t border-white/10 px-4 py-20 sm:px-6 lg:px-8"
      aria-labelledby="contact-heading"
    >
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-400">
            {t.eyebrow}
          </p>
          <h2
            id="contact-heading"
            className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl"
          >
            {title ?? messages.home.general.contactTitle}
          </h2>
          <p className="mt-4 text-zinc-400">{body ?? messages.home.general.contactBody}</p>
          <p className="mt-3 text-sm text-zinc-500">
            {t.browseFirst}{" "}
            <a
              href={localize("/pricing")}
              className="font-medium text-indigo-300 underline-offset-2 transition hover:text-indigo-200 hover:underline"
              onClick={() =>
                trackEvent("cta_click", {
                  cta_name: "view_pricing",
                  location: "contact",
                })
              }
            >
              {t.seePricing}
            </a>
            .
          </p>
        </div>
        <div className="mt-10 grid gap-8 lg:grid-cols-5">
        <aside className="space-y-6 lg:col-span-2" aria-label={t.otherWaysAria}>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
              {t.talkNow}
            </h3>
            <ContactOptions location="contact" layout="stack" className="mt-3" />
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
              {t.nextTitle}
            </h3>
            <ol className="mt-3 space-y-3 text-sm text-zinc-300">
              {t.steps.map((step, index) => (
                <li key={step} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-semibold text-indigo-200">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </aside>
        <BrandCard
          as="div"
          accent="indigo"
          innerClassName="p-6 sm:p-8"
          className="lg:col-span-3"
        >
          <form onSubmit={onSubmit} className="relative space-y-4">
              {/* Honeypot — leave empty. Text field (not checkbox) so FB autofill tools do not trip spam. */}
              <div
                className="absolute -left-[9999px] h-0 w-0 overflow-hidden"
                aria-hidden="true"
              >
                <label htmlFor="website_url">Website</label>
                <input
                  id="website_url"
                  name="website_url"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                />
              </div>
              <div>
                <label
                  htmlFor="fullName"
                  className="block text-sm font-medium text-zinc-200"
                >
                  {t.fullName}
                </label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  required
                  className={fieldClass}
                  placeholder={t.namePlaceholder}
                />
              </div>
              <div>
                <label
                  htmlFor="business"
                  className="block text-sm font-medium text-zinc-200"
                >
                  {t.business}
                </label>
                <input
                  id="business"
                  name="business"
                  type="text"
                  autoComplete="organization"
                  required
                  className={fieldClass}
                  placeholder={t.businessPlaceholder}
                />
              </div>
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-zinc-200"
                >
                  {t.email}
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className={fieldClass}
                  placeholder="you@company.com"
                />
              </div>
              <div>
                <label
                  htmlFor="phone"
                  className="block text-sm font-medium text-zinc-200"
                >
                  {t.phone} <span className="font-normal text-zinc-500">{t.phoneHint}</span>
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  className={fieldClass}
                  placeholder="403-555-0123"
                />
              </div>
              <div>
                <label
                  htmlFor="service"
                  className="block text-sm font-medium text-zinc-200"
                >
                  {t.service}
                </label>
                <select
                  id="service"
                  name="service"
                  required
                  defaultValue=""
                  className={`${fieldClass} appearance-none bg-[length:1rem] bg-[right_0.75rem_center] bg-no-repeat pr-10`}
                  style={{
                    backgroundImage:
                      "url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23a1a1aa'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E\")",
                  }}
                >
                  <option value="" disabled>
                    {t.selectService}
                  </option>
                  <option value="website-design">{t.services.design}</option>
                  <option value="custom-web-dev">{t.services.dev}</option>
                  <option value="digital-marketing">{t.services.marketing}</option>
                  <option value="combined-full-package">{t.services.combined}</option>
                </select>
              </div>
              <div>
                <label
                  htmlFor="details"
                  className="block text-sm font-medium text-zinc-200"
                >
                  {t.details}
                </label>
                <textarea
                  id="details"
                  name="details"
                  required
                  rows={5}
                  className={`${fieldClass} resize-y`}
                  placeholder={t.detailsPlaceholder}
                />
              </div>
              {error ? (
                <p className="text-sm text-red-400" role="alert">
                  {error}
                </p>
              ) : null}
              {notice ? (
                <p className="text-sm text-zinc-300" role="status">
                  {notice}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={sending}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sending ? t.sending : t.submit}
                <Send className="h-4 w-4" aria-hidden="true" />
              </button>
            </form>
        </BrandCard>
        </div>
        <LocationMap
          heading={t.mapHeading}
          mapTitle={t.mapTitle}
          directions={t.directions}
          openInMaps={t.openInMaps}
          lang={locale}
          onLinkClick={(link) => trackEvent("map_click", { link, location: "contact" })}
        />
        <div className="mt-6 flex justify-center">
          <GoogleRating location="contact" />
        </div>
      </div>
    </section>
  );
}
