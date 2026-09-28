import type { Metadata } from "next";
import { headers } from "next/headers";
import {
  DEFAULT_LOCALE,
  LOCALE_HEADER,
  LOCALE_META,
  isLocale,
  languageAlternates,
  localizePath,
  type Locale,
} from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";

/** Page language for this request; middleware sets it from the URL prefix. */
export function getLocale(): Locale {
  const value = headers().get(LOCALE_HEADER);
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export function getServerMessages() {
  return getMessages(getLocale());
}

/** Canonical + hreflang + og:locale for a translated page, given its English path. */
export function localizedMetadata(locale: Locale, path: string, metadata: Metadata): Metadata {
  return {
    ...metadata,
    alternates: {
      ...metadata.alternates,
      canonical: localizePath(path, locale),
      languages: languageAlternates(path),
    },
    ...(metadata.openGraph
      ? {
          openGraph: {
            ...metadata.openGraph,
            locale: LOCALE_META[locale].og,
          },
        }
      : {}),
  };
}
