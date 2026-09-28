import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";
import { getLocationPage, type LocationPage } from "@/lib/locations";
import type { HomeCopy, VisitorAudience } from "@/lib/visitorRegion";

/** Shared non-Alberta marketing copy — same MarketingHomeStack, general framing. */
export function homeCopyGeneral(locale: Locale = DEFAULT_LOCALE): HomeCopy {
  return getMessages(locale).home.general;
}

/** Alberta-rooted copy for `/locations` hub and city lander base. */
export function homeCopyAlberta(locale: Locale = DEFAULT_LOCALE): HomeCopy {
  return getMessages(locale).home.alberta;
}

/**
 * Audience → homepage copy.
 * Alberta city geo still redirects to /locations/[city].
 * Canada + international (and anyone on `/` outside those landers) get general stack copy.
 */
export function homeCopyForAudience(
  audience: VisitorAudience,
  locale: Locale = DEFAULT_LOCALE,
): HomeCopy {
  if (audience === "alberta") return homeCopyAlberta(locale);
  return homeCopyGeneral(locale);
}

/** City page with its wording in the requested language. */
export function localizedLocationPage(
  slug: string,
  locale: Locale = DEFAULT_LOCALE,
): LocationPage | null {
  const page = getLocationPage(slug);
  if (!page) return null;
  const override = getMessages(locale).cities[slug];
  return override ? { ...page, ...override, focus: [...override.focus], keywords: [...override.keywords] } : page;
}

/** Same homepage copy shape — city name swapped into hero / services / contact. */
export function homeCopyForLocation(page: LocationPage, locale: Locale = DEFAULT_LOCALE): HomeCopy {
  return { ...homeCopyAlberta(locale), ...getMessages(locale).home.city(page) };
}

/** Alberta-wide `/locations` hub — same stack as home, not locked to one city. */
export function homeCopyForLocationsHub(locale: Locale = DEFAULT_LOCALE): HomeCopy {
  return { ...homeCopyAlberta(locale), ...getMessages(locale).home.locationsHub };
}
