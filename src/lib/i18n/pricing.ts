import type { Locale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";
import type { PricingItem } from "@/lib/pricing";

/** Pricing item with its name, blurb and bullets in the requested language. */
export function localizePricingItem(item: PricingItem, locale: Locale): PricingItem {
  const copy = getMessages(locale).pricingItems[item.id];
  if (!copy) return item;
  return {
    ...item,
    name: copy.name,
    blurb: copy.blurb,
    includes: [...copy.includes],
    badge: copy.badge ?? item.badge,
    timeline: copy.timeline ?? item.timeline,
  };
}
