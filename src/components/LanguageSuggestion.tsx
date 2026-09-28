"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Languages, X } from "lucide-react";
import { useLocaleHref } from "@/components/LanguageSwitch";
import { DEFAULT_LOCALE, LOCALES, LOCALE_META, type Locale } from "@/lib/i18n/config";
import { readSavedLocale, rememberLocale } from "@/lib/i18n/cookie";
import { useLocale } from "@/lib/i18n/client";
import { getMessages } from "@/lib/i18n/messages";

/** Browser language that has a translation, e.g. `fr-CA` → `fr`. */
function preferredLocale(): Locale | null {
  const languages = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const tag of languages) {
    const base = tag?.toLowerCase().split("-")[0];
    if (base === DEFAULT_LOCALE) return null;
    const match = LOCALES.find((locale) => locale === base);
    if (match) return match;
  }
  return null;
}

/**
 * Offers the translated site to visitors whose browser prefers another language.
 * Never redirects on its own; choosing either option is remembered.
 */
export function LanguageSuggestion() {
  const current = useLocale();
  const pathname = usePathname() || "";
  const hrefFor = useLocaleHref();
  const [target, setTarget] = useState<Locale | null>(null);

  useEffect(() => {
    if (current !== DEFAULT_LOCALE || readSavedLocale()) return;
    setTarget(preferredLocale());
  }, [current]);

  if (!target || pathname.startsWith("/hub")) return null;
  const t = getMessages(target).language;
  if (!t.suggestion) return null;

  return (
    <div
      lang={LOCALE_META[target].intl}
      className="relative z-[60] border-b border-sky-500/30 bg-sky-500/10 px-10 py-2.5 text-center text-sm text-sky-100"
    >
      <Languages className="mr-1.5 inline h-3.5 w-3.5" aria-hidden="true" />
      {t.suggestion}{" "}
      <a
        href={hrefFor(target)}
        hrefLang={LOCALE_META[target].hreflang}
        onClick={(event) => {
          event.preventDefault();
          rememberLocale(target);
          window.location.assign(`${hrefFor(target)}${window.location.search}${window.location.hash}`);
        }}
        className="font-semibold text-white underline-offset-2 hover:underline"
      >
        {t.suggestionCta}
      </a>
      <button
        type="button"
        onClick={() => {
          rememberLocale(DEFAULT_LOCALE);
          setTarget(null);
        }}
        className="absolute right-3 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-sky-200 hover:bg-white/10 hover:text-white"
      >
        <span className="sr-only">{t.dismiss}</span>
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
