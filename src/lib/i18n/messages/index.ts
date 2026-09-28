import type { Locale } from "@/lib/i18n/config";
import type { Widen } from "@/lib/i18n/types";
import { en } from "@/lib/i18n/messages/en";
import { fr } from "@/lib/i18n/messages/fr";

/** Every language file must match the English shape. */
export type Messages = Widen<typeof en>;

const MESSAGES: Record<Locale, Messages> = { en, fr };

export function getMessages(locale: Locale): Messages {
  return MESSAGES[locale] ?? MESSAGES.en;
}
