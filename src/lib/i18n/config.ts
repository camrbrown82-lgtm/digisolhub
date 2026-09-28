/**
 * Site languages. English lives at the bare path (/pricing); every other
 * language gets a prefix (/fr/pricing). To add a language, add it here and
 * add a messages file in `src/lib/i18n/messages/`.
 */
export const LOCALES = ["en", "fr"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

/** Remembers a visitor's explicit language choice. */
export const LOCALE_COOKIE = "ds_lang";
/** Set by middleware on every public request; read by `getLocale()`. */
export const LOCALE_HEADER = "x-digisol-locale";

export const LOCALE_META: Record<
  Locale,
  { label: string; short: string; hreflang: string; og: string; intl: string }
> = {
  en: { label: "English", short: "EN", hreflang: "en-CA", og: "en_CA", intl: "en-CA" },
  fr: { label: "Français", short: "FR", hreflang: "fr-CA", og: "fr_CA", intl: "fr-CA" },
};

/** Pages that have translations. Blog, Dispatch, media, privacy and the Hub stay English-only. */
const TRANSLATED_PATHS = [
  /^\/$/,
  /^\/about$/,
  /^\/pricing$/,
  /^\/pricing\/success$/,
  /^\/confirmation$/,
  /^\/locations$/,
  /^\/locations\/[\w-]+$/,
];

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export function isTranslatedPath(path: string) {
  return TRANSLATED_PATHS.some((pattern) => pattern.test(path));
}

/** `/fr/pricing` → `{ locale: "fr", path: "/pricing" }`; `/pricing` → English. */
export function splitLocale(pathname: string): { locale: Locale; path: string } {
  const match = pathname.match(/^\/([a-z]{2})(\/.*)?$/);
  if (match && isLocale(match[1]) && match[1] !== DEFAULT_LOCALE) {
    return { locale: match[1], path: match[2] || "/" };
  }
  return { locale: DEFAULT_LOCALE, path: pathname || "/" };
}

/**
 * Adds the language prefix to an internal link when that page is translated.
 * `/#contact` → `/fr#contact`. External, hash-only and English-only links are unchanged.
 */
export function localizePath(href: string, locale: Locale) {
  if (locale === DEFAULT_LOCALE || !href.startsWith("/") || href.startsWith("//")) return href;
  const [, path = "/", rest = ""] = href.match(/^([^?#]*)(.*)$/) ?? [];
  if (!isTranslatedPath(path || "/")) return href;
  return `${path === "/" || !path ? `/${locale}` : `/${locale}${path}`}${rest}`;
}

/** hreflang map for a translated English path, for `metadata.alternates.languages`. */
export function languageAlternates(path: string) {
  const languages: Record<string, string> = {};
  for (const locale of LOCALES) {
    languages[LOCALE_META[locale].hreflang] = localizePath(path, locale);
  }
  languages["x-default"] = path;
  return languages;
}
