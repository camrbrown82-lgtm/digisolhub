"use client";

import { FormEvent, useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { useLocale, useLocalizedHref, useMessages } from "@/lib/i18n/client";
import { submitLead } from "@/lib/leadSubmit";
import { DIGISOL_EMAIL, DIGISOL_PHONE_DISPLAY } from "@/lib/site";

const field =
  "w-full rounded-lg border border-white/15 bg-zinc-950/80 px-3 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30";

/** English path; pass through `localizePath` / `useLocalizedHref` before rendering. */
export const QUOTE_HREF = "/#quote";

/** Scrolls to this page's quote form when it has one; otherwise the link goes to the homepage form. */
export function jumpToQuote(event: MouseEvent<HTMLAnchorElement>, delayMs = 0) {
  const form = document.getElementById("quote");
  if (!form) return;
  event.preventDefault();
  const scroll = () => form.scrollIntoView({ behavior: "smooth", block: "start" });
  if (delayMs) window.setTimeout(scroll, delayMs);
  else scroll();
}

/** Four-field quote request for the hero, pricing, and blog posts; same pipeline as the full form. */
export function QuickQuote({
  location,
  id = "quote",
  heading,
  sub,
}: {
  location: string;
  id?: string;
  heading?: string;
  sub?: string;
}) {
  const router = useRouter();
  const locale = useLocale();
  const localize = useLocalizedHref();
  const t = useMessages().quickQuote;
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const fieldId = (name: string) => `${id}-${name}`;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setSending(true);
    const form = event.currentTarget;
    const data = new FormData(form);
    const value = (key: string) => String(data.get(key) ?? "").trim();
    try {
      const outcome = await submitLead(
        {
          name: value("name"),
          email: value("email"),
          phone: value("phone"),
          service: value("service"),
          message: `Quick quote request (${location}).`,
          language: locale,
          website_url: value("website_url"),
        },
        `quick_quote_${location}`,
      );
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
          : t.error(DIGISOL_EMAIL, DIGISOL_PHONE_DISPLAY),
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      id={id}
      className="scroll-mt-24 rounded-2xl border border-indigo-400/30 bg-zinc-900/70 p-5 text-left shadow-xl shadow-indigo-950/40 backdrop-blur sm:p-6"
    >
      <p className="text-lg font-semibold text-white">{heading ?? t.heading}</p>
      <p className="mt-1 text-sm text-zinc-400">{sub ?? t.sub}</p>
      <form onSubmit={onSubmit} className="relative mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
          <label htmlFor={fieldId("website_url")}>Website</label>
          <input id={fieldId("website_url")} name="website_url" type="text" tabIndex={-1} autoComplete="off" />
        </div>
        <label className="sr-only" htmlFor={fieldId("name")}>{t.name}</label>
        <input
          id={fieldId("name")}
          name="name"
          required
          autoComplete="name"
          placeholder={t.name}
          className={field}
        />
        <label className="sr-only" htmlFor={fieldId("email")}>{t.email}</label>
        <input
          id={fieldId("email")}
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder={t.email}
          className={field}
        />
        <label className="sr-only" htmlFor={fieldId("phone")}>{t.phone}</label>
        <input
          id={fieldId("phone")}
          name="phone"
          type="tel"
          autoComplete="tel"
          placeholder={t.phone}
          className={field}
        />
        <label className="sr-only" htmlFor={fieldId("service")}>{t.need}</label>
        <select id={fieldId("service")} name="service" required defaultValue="" className={field}>
          <option value="" disabled>
            {t.need}
          </option>
          <option value="website-design">{t.options.design}</option>
          <option value="custom-web-dev">{t.options.dev}</option>
          <option value="digital-marketing">{t.options.marketing}</option>
          <option value="combined-full-package">{t.options.combined}</option>
        </select>
        <button
          type="submit"
          disabled={sending}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-500 disabled:opacity-60 sm:col-span-2 lg:col-span-4"
        >
          {sending ? t.sending : t.submit}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </form>
      {error ? (
        <p className="mt-3 text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="mt-3 text-sm text-zinc-300" role="status">
          {notice}
        </p>
      ) : null}
    </div>
  );
}
