/**
 * Sales pitches sent through the website contact form (review removal, SEO
 * outreach, WhatsApp/Telegram hand-offs). Needs two separate signals, so a real
 * customer asking about their own reviews or SEO is never flagged.
 */
const PITCH_SIGNALS: Array<{ reason: string; pattern: RegExp }> = [
  {
    reason: "review removal",
    pattern: /\b(remove|removal|delete|deleting|erase)\b[^.]{0,60}\b(bad|negative|fake|old)\b[^.]{0,20}\breviews?\b|\b(bad|negative|fake)\s+reviews?\b[^.]{0,80}\b(removed|deleted|permanently)\b/i,
  },
  {
    reason: "pay after results",
    pattern: /\b(no|without( any)?)\s+(advance|upfront|up-front)\s+payment\b|\bpay\s+(only\s+)?after\b[^.]{0,40}\b(removal|results?|complete|ranking)\b/i,
  },
  {
    reason: "messaging app hand-off",
    pattern: /\b(whats\s?app|telegram)\b[^.]{0,30}(:|\+?\d[\d\s().-]{6,})|contact (our|my) team (on|via) (whats\s?app|telegram)/i,
  },
  {
    reason: "SEO or link outreach",
    pattern: /\b(guest post|backlinks?|link building|dofollow|first page of google|rank (your|ur) (website|site) (on|at) (the )?(top|first page))\b/i,
  },
  {
    reason: "link-stuffed",
    pattern: /(https?:\/\/|www\.)[\s\S]*(https?:\/\/|www\.)[\s\S]*(https?:\/\/|www\.)/i,
  },
];

export function formSpamReasons(fields: {
  name?: string | null;
  company?: string | null;
  message?: string | null;
}): string[] | null {
  const text = [fields.name, fields.company, fields.message]
    .filter(Boolean)
    .join(" \n ");
  if (!text.trim()) return null;
  const hits = PITCH_SIGNALS.filter(({ pattern }) => pattern.test(text)).map(
    ({ reason }) => reason,
  );
  return hits.length >= 2 ? hits : null;
}
