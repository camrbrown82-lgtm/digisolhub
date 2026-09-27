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

const NOISE_PREFIXES = [
  "noreply",
  "no-reply",
  "donotreply",
  "mailer-daemon",
  "postmaster",
  "bounce",
  "daemon",
];

/** Inboxes that are not the business's published contact — common bounce and CASL misses. */
const PLATFORM_DOMAINS = [
  "wix.com",
  "wixsite.com",
  "squarespace.com",
  "godaddy.com",
  "sentry.io",
  "sentry.wixpress.com",
  "cloudflare.com",
  "wordpress.com",
  "wordpress.org",
  "shopify.com",
  "myshopify.com",
  "facebook.com",
  "fb.com",
  "instagram.com",
  "google.com",
  "gstatic.com",
  "schema.org",
  "w3.org",
  "example.com",
  "email.com",
  "domain.com",
  "squarespace-mail.com",
  "mailchimp.com",
  "hubspot.com",
  "hs-scripts.com",
  "calendly.com",
  "squareup.com",
  "jquery.com",
  "cloudfront.net",
  "amazonaws.com",
  "github.com",
  "gravatar.com",
];

const FAKE_LOCALS = new Set([
  "test",
  "user",
  "username",
  "name",
  "email",
  "youremail",
  "yourname",
  "someone",
  "image",
  "logo",
  "sprite",
  "webpack",
  "sentry",
  "placeholder",
  "sample",
  "example",
]);

const BAD_TLDS = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "svg",
  "webp",
  "css",
  "js",
  "map",
  "woff",
  "woff2",
  "ttf",
]);

const CONTACT_CONTEXT =
  /contact|e-?mail|reach|call us|write|enquir|inquir|hello|info@|office|book/i;

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

  const published = conspicuousHtml(html);
  const plain = htmlToPlainExcerpt(published, 20000);

  const mailtoMatches = Array.from(published.matchAll(/mailto:([^"'?\s>]+)/gi))
    .map((m) => decodeURIComponent(m[1] || "").replace(/&amp;/gi, "&").trim().toLowerCase())
    .map((value) => value.split("?")[0] || "")
    .filter((email) => email.includes("@"));

  const visibleMatches = Array.from(plain.matchAll(EMAIL_RE))
    .map((m) => m[0].toLowerCase())
    .filter(Boolean);

  const candidates = Array.from(new Set([...mailtoMatches, ...visibleMatches]))
    .map(normalizeEmail)
    .filter((email): email is string => Boolean(email))
    .filter((email) => !isNoiseAddress(email))
    .filter((email) => !isPlatformEmail(email));

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

  const mailtoSet = new Set(
    mailtoMatches
      .map(normalizeEmail)
      .filter((email): email is string => Boolean(email)),
  );
  const onSite = (email: string) => ownsBusinessDomain(email, siteHost);
  const inContext = (email: string) => emailInContactContext(plain, email);

  // CASL: the address must be conspicuously published (a mailto or visible
  // contact copy), on the business's own domain. Vendor and personal inboxes
  // are not a basis for a cold CEM, and they are where bounces come from.
  const preferred =
    candidates.find((email) => mailtoSet.has(email) && onSite(email)) ||
    candidates.find((email) => onSite(email) && inContext(email) && mailtoSet.has(email)) ||
    candidates.find((email) => onSite(email) && inContext(email)) ||
    null;

  if (!preferred) {
    const onlyPersonal = candidates.every((email) =>
      PERSONAL_DOMAINS.has(email.split("@")[1] || ""),
    );
    return {
      eligible: false,
      email: null,
      basis: candidates.length ? "blocked" : "missing",
      reason: onlyPersonal
        ? "Only personal inbox domains found — CASL conspicuous-publication basis not met for cold outreach."
        : "No business email is conspicuously published on this website. Not sending.",
      evidence: {
        mailtoMatches,
        visibleMatches: visibleMatches.slice(0, 8),
        preferred: null,
        siteHost,
      },
    };
  }

  const fromMailto = mailtoSet.has(preferred);

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

function conspicuousHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");
}

function normalizeEmail(value: string) {
  const email = value
    .trim()
    .toLowerCase()
    .replace(/^mailto:/i, "")
    .replace(/[>,);]+$/g, "");
  if (!/^[a-z0-9][a-z0-9._%+-]{0,63}@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/.test(email)) {
    return null;
  }
  if (email.length > 120 || email.includes("..")) return null;
  const [local, domain] = email.split("@");
  const tld = domain?.split(".").pop() || "";
  if (!local || !domain || BAD_TLDS.has(tld) || tld.length < 2) return null;
  if (FAKE_LOCALS.has(local)) return null;
  if (domain.includes("example") || domain.includes("yourdomain") || domain.endsWith(".invalid")) {
    return null;
  }
  return email;
}

function isPlatformEmail(email: string) {
  const domain = email.split("@")[1] || "";
  if (PERSONAL_DOMAINS.has(domain)) return true;
  return PLATFORM_DOMAINS.some(
    (platform) => domain === platform || domain.endsWith(`.${platform}`),
  );
}

function ownsBusinessDomain(email: string, siteHost: string | null) {
  if (!siteHost) return false;
  const domain = email.split("@")[1] || "";
  return (
    domain === siteHost ||
    siteHost.endsWith(`.${domain}`) ||
    domain.endsWith(`.${siteHost}`)
  );
}

function emailInContactContext(plain: string, email: string) {
  const at = plain.toLowerCase().indexOf(email);
  if (at < 0) return false;
  const window = plain.slice(Math.max(0, at - 180), at + email.length + 180);
  return CONTACT_CONTEXT.test(window);
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
