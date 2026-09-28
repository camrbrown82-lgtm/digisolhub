"use client";

import { usePathname } from "next/navigation";
import {
  LOCALES,
  LOCALE_META,
  isTranslatedPath,
  localizePath,
  splitLocale,
  type Locale,
} from "@/lib/i18n/config";
import { rememberLocale } from "@/lib/i18n/cookie";
import { useLocale, useMessages } from "@/lib/i18n/client";

/** Where the switch sends a visitor: the same page in the other language, or that language's home. */
export function useLocaleHref() {
  const { path } = splitLocale(usePathname() || "/");
  return (target: Locale) => (isTranslatedPath(path) ? localizePath(path, target) : localizePath("/", target));
}

export function LanguageSwitch({ className = "" }: { className?: string }) {
  const current = useLocale();
  const t = useMessages();
  const hrefFor = useLocaleHref();

  return (
    <div role="group" aria-label={t.language.switchLabel} className={`flex items-center text-xs font-semibold ${className}`}>
      {LOCALES.map((locale, i) => {
        const active = locale === current;
        return (
          <span key={locale} className="flex items-center">
            {i > 0 ? <span className="px-1 text-zinc-600" aria-hidden>|</span> : null}
            {active ? (
              <span aria-current="true" className="text-white">
                {LOCALE_META[locale].short}
              </span>
            ) : (
              <a
                href={hrefFor(locale)}
                hrefLang={LOCALE_META[locale].hreflang}
                lang={LOCALE_META[locale].intl}
                title={LOCALE_META[locale].label}
                onClick={(event) => {
                  event.preventDefault();
                  rememberLocale(locale);
                  window.location.assign(`${hrefFor(locale)}${window.location.search}${window.location.hash}`);
                }}
                className="text-zinc-400 transition-colors hover:text-white"
              >
                {LOCALE_META[locale].short}
              </a>
            )}
          </span>
        );
      })}
    </div>
  );
}
