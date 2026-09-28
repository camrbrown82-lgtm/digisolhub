import type { AuditEmailSource, ScoreTier } from "@/lib/i18n/types";

/** Kaylev's audit breakdown and consultation emails. HTML helpers expect pre-escaped arguments. */
export const enEmails = {
  auditSubject: (score: number, source: AuditEmailSource, tier: ScoreTier) => {
    if (source === "visitor_chat") {
      return tier === "strong"
        ? `Your DigiSol audit — ${score}/100 (solid site) + DigiSol Hub`
        : `Your DigiSol website audit — ${score}/100`;
    }
    if (tier === "strong") return `Your site scored ${score}/100 — keep the wins with DigiSol Hub`;
    if (tier === "solid") return `A quick look at your website (${score}/100)`;
    return "A few fixes that would help your website";
  },
  auditOpener: (opts: { score: number; first: string; source: AuditEmailSource; tier: ScoreTier }) => {
    const hi =
      opts.source === "visitor_chat"
        ? `Hi${opts.first ? ` ${opts.first}` : ""} — thanks for requesting a DigiSol website audit.`
        : `Hey${opts.first ? ` ${opts.first}` : ""} — I took a quick look at your site.`;
    if (opts.tier === "strong") {
      return `${hi} Good news: it already scores well (${opts.score}/100). The opportunity now is turning that traffic into booked work and keeping follow-ups organized.`;
    }
    if (opts.tier === "solid") {
      return `${hi} You're in decent shape (${opts.score}/100) with a few clear upgrades that would help more visitors take action.`;
    }
    return `${hi} There's real room to improve how the site loads, ranks locally, and converts visitors into calls.`;
  },
  defaultSummary: (url: string) => `DigiSol reviewed ${url} and prepared a short follow-up.`,
  fallbackWeaknessesStrong: [
    "Keep measuring what converts (forms, calls, booked consults)",
    "Protect speed and mobile clarity as you add content",
  ],
  fallbackWeaknesses: ["Clarify the primary call-to-action", "Tighten page speed and SEO basics"],
  strengthsHeading: "What's working:",
  scoreFrame: (tier: ScoreTier, score: number, url: string) =>
    tier === "strong"
      ? `<p><strong>Score:</strong> ${score}/100 for ${url} — this is a strong result. An audit that lands here should still create value: DigiSol Hub keeps leads, nurture, and follow-ups working so the site's strength turns into booked conversations.</p>`
      : tier === "solid"
        ? `<p><strong>Quick score:</strong> ${score}/100 for ${url} — solid baseline, with a short list of upgrades that usually pay off first.</p>`
        : `<p><strong>Quick score:</strong> ${score}/100 for ${url} — the list below is what we'd tackle first.</p>`,
  fixHeading: (tier: ScoreTier) =>
    tier === "strong"
      ? "Keep these sharp (even strong sites slip here):"
      : "Breakdown — worth fixing first:",
  hubPitch: (tier: ScoreTier, pricingUrl: string) =>
    tier === "strong"
      ? `<p><strong>Your site is in good shape — here is what to do with that traffic:</strong></p>
<ul>
<li><strong>DigiSol Hub</strong> — CRM, nurture workflows, and campaign results on the site you already have.</li>
<li><strong>Local growth, paid media, or full growth retainer</strong> — ongoing SEO, ads, and follow-up.</li>
<li><strong>Extra pages and city landings</strong> — grow coverage without a full rebuild.</li>
</ul>
<p><a href="${pricingUrl}">See Hub, retainers, and growth options</a> (website rebuilds stay optional on that page).</p>`
      : tier === "needs_work"
        ? `<p>Start with the audit walkthrough above, then <a href="${pricingUrl}">see website packages and pricing</a> when you are ready to fix the gaps.</p>`
        : `<p><a href="${pricingUrl}">See DigiSol pricing</a> — website packages, Hub, and monthly growth.</p>`,
  videoIntro: "Watch the DigiSol website audit presentation",
  videoDetail: "(what we look for in design, speed, local SEO, and conversion):",
  helpHeading: "Ways DigiSol can help (no obligation):",
  consultLine: (founder: string, title: string, strong: boolean) =>
    `If you want a direct walkthrough, ${founder} (${title}) is happy to hop on a short consultation — no hard sell, just clarity on what would move the needle${strong ? " (including whether Hub alone is the right next step)" : " for your site"}.`,
  bookConsult: "Book a consultation",
  pricing: "Pricing",
  casl: (source: AuditEmailSource) =>
    source === "visitor_chat"
      ? "You are receiving this because you requested a DigiSol website audit."
      : "You are receiving this because your business contact address is published on your website and this note relates to your online presence.",
  footer: "DigiSol · Alberta, Canada. Reply to unsubscribe anytime.",
  products: {
    hubWorkspace: {
      name: "DigiSol Hub workspace",
      blurb:
        "Your site is in good shape — Hub turns visitors into tracked leads, nurture sequences, and booked consults without another spreadsheet.",
    },
    conversionPolish: {
      name: "Conversion polish",
      blurb:
        "Light CRO on CTAs and forms so a strong site books more work from the traffic you already earn.",
    },
    growthCoaching: {
      name: "Ongoing growth coaching",
      blurb:
        "Listings, reviews, and Hub workflows kept current so the score stays high and leads keep moving.",
    },
    foundation: {
      name: "Foundation website build",
      blurb:
        "A clean, fast Next.js site that loads well on mobile and captures leads into DigiSol Hub.",
    },
    localSeo: {
      name: "Local SEO & discovery",
      blurb:
        "Help nearby customers find you — listings, on-page SEO, and clearer service pages for Alberta search.",
    },
    conversionPaths: {
      name: "Conversion paths",
      blurb: "Clearer CTAs, forms, and follow-up so visitors become booked conversations.",
    },
    hub: {
      name: "DigiSol Hub",
      blurb:
        "Keep contacts, nurture emails, and audit follow-ups in one place so nothing falls through — even while the site is being improved.",
    },
  },
  consultSubject: "Your free DigiSol consultation",
  consultHi: (first: string) =>
    `Hi${first ? ` ${first}` : ""} — thanks for chatting with Kaylev on DigiSol.`,
  consultBody: (requirements: string, founder: string, title: string) =>
    `You asked about next steps${requirements ? ` (${requirements})` : ""} — and you do not need to figure out every detail alone. ${founder} (${title}) offers a <strong>free consultation</strong>: a short, no-pressure call to clarify what would help your business grow online.`,
  consultCta: "Book your free consultation",
  consultDirect: "Or reach Cameron directly:",
  consultCasl:
    "You are receiving this because you requested a DigiSol consultation via Kaylev. DigiSol · Alberta, Canada. Reply to unsubscribe anytime.",
};
