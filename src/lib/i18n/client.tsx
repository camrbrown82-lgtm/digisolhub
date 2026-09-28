"use client";

import { createContext, useContext, type ReactNode } from "react";
import { DEFAULT_LOCALE, localizePath, type Locale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  return useContext(LocaleContext);
}

export function useMessages() {
  return getMessages(useLocale());
}

/** Localizes internal links for the current page language. */
export function useLocalizedHref() {
  const locale = useLocale();
  return (href: string) => localizePath(href, locale);
}
