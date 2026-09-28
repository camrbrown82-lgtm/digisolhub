import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";

export const SHARE_CARD_SIZE = { width: 1200, height: 630 } as const;

/** Pages with their own link-preview card; city pages pass `city` instead. */
export const SHARE_PAGES = [
  "home",
  "pricing",
  "about",
  "locations",
  "blog",
  "dispatch",
  "privacy",
  "video",
] as const;
export type SharePage = (typeof SHARE_PAGES)[number];

export function isSharePage(value: unknown): value is SharePage {
  return typeof value === "string" && (SHARE_PAGES as readonly string[]).includes(value);
}

export type ShareCardOptions = {
  page?: SharePage;
  /** Location slug; renders the city card. */
  city?: string;
  locale?: Locale;
};

/** Branded 1200x630 link preview rendered by `/og.jpg`. */
export function shareCardPath({ page = "home", city, locale = DEFAULT_LOCALE }: ShareCardOptions = {}) {
  const params = new URLSearchParams();
  if (city) params.set("city", city);
  else if (page !== "home") params.set("page", page);
  if (locale !== DEFAULT_LOCALE) params.set("lang", locale);
  const query = params.toString();
  return query ? `/og.jpg?${query}` : "/og.jpg";
}

/** `openGraph.images` / `twitter.images` entry for a page's preview card. */
export function shareCardImages(alt: string, options: ShareCardOptions = {}) {
  return [{ url: shareCardPath(options), ...SHARE_CARD_SIZE, alt, type: "image/jpeg" }];
}
