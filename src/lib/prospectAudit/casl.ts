const EMAIL_RE =
  /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;

const PERSONAL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.ca",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "icloud.com",
  "me.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
]);

const NOISE_PREFIXES = ["noreply", "no-reply", "donotreply", "mailer-daemon", "postmaster"];

export type CaslContactResult = {
  eligible: boolean;
  email: string | null;
  basis: "conspicuously_published" | "blocked" | "missing";
  reason: string;
  evidence: {
    mailtoMatches: string[];
    visibleMatches: string[];
    preferred: string | null;
    siteHost: string | null;
  };
};

/**
 * CASL gate for cold B2B CEMs:
 * only proceed when a business electronic address is conspicuously published
 * on the prospect site and the message relates to their business role.
 */
export function evaluateCaslPublishedContact(
  html: string,
  siteUrl: string,
): CaslContactResult {
  let siteHost: string | null = null;
  try {
    siteHost = new URL(siteUrl).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    siteHost = null;
  }

  const mailtoMatches = Array.from(
    html.matchAll(/mailto:([^"'?\s>]+)/gi),
  )
    .map((m) => decodeURIComponent(m[1] || "").trim().toLowerCase())
    .filter((email) => email.includes("@"));

  const visibleMatches = Array.from(html.matchAll(EMAIL_RE))
    .map((m) => m[0].toLowerCase())
    .filter(Boolean);

  const candidates = Array.from(new Set([...mailtoMatches, ...visibleMatches]))
    .map(normalizeEmail)
    .filter((email): email is string => Boolean(email))
    .filter((email) => !isNoiseAddress(email));

  if (candidates.length === 0) {
    return {
      eligible: false,
      email: null,
      basis: "missing",
      reason: "No conspicuously published email found on the business website.",
      evidence: {
        mailtoMatches,
        visibleMatches,
        preferred: null,
        siteHost,
      },
    };
  }

  // Prefer addresses on the same business domain; then other non-personal domains.
  const sameDomain = siteHost
    ? candidates.filter((email) => email.endsWith(`@${siteHost}`))
    : [];
  const businessDomain = candidates.filter((email) => {
    const domain = email.split("@")[1] || "";
    return !PERSONAL_DOMAINS.has(domain);
  });

  const preferred =
    sameDomain[0] || businessDomain[0] || null;

  if (!preferred) {
    return {
      eligible: false,
      email: null,
      basis: "blocked",
      reason:
        "Only personal inbox domains found — CASL conspicuous-publication basis not met for cold outreach.",
      evidence: {
        mailtoMatches,
        visibleMatches,
        preferred: null,
        siteHost,
      },
    };
  }

  // Prefer mailto: (clearly published contact mechanism).
  const fromMailto = mailtoMatches
    .map(normalizeEmail)
    .includes(preferred);

  if (!fromMailto && visibleMatches.length === 0) {
    return {
      eligible: false,
      email: preferred,
      basis: "blocked",
      reason: "Email was not conspicuously published as a contact address.",
      evidence: {
        mailtoMatches,
        visibleMatches,
        preferred,
        siteHost,
      },
    };
  }

  return {
    eligible: true,
    email: preferred,
    basis: "conspicuously_published",
    reason: fromMailto
      ? "Business email published via mailto: on the prospect website."
      : "Business email conspicuously listed on the prospect website.",
    evidence: {
      mailtoMatches,
      visibleMatches: visibleMatches.slice(0, 8),
      preferred,
      siteHost,
    },
  };
}

function normalizeEmail(value: string) {
  const email = value.trim().toLowerCase().replace(/^mailto:/i, "");
  if (!email.includes("@") || email.length > 120) return null;
  if (email.includes("example.com") || email.includes("yourdomain")) return null;
  return email;
}

function isNoiseAddress(email: string) {
  const local = email.split("@")[0] || "";
  return NOISE_PREFIXES.some((prefix) => local.startsWith(prefix));
}

/** Strip tags for a short plain-text excerpt fed to gpt-4o-mini. */
export function htmlToPlainExcerpt(html: string, maxChars: number) {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
  return text.slice(0, maxChars);
}
