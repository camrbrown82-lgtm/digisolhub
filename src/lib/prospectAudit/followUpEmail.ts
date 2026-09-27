import type { SupabaseClient } from "@supabase/supabase-js";
import { DIGISOL_BRAND, DIGISOL_HOUSE_NAME } from "@/lib/branding";
import {
  findOrCreateContactForSend,
  getResendApiKey,
  sendEmailToContact,
} from "@/lib/email";
import { WEBSITE_AUDIT_PAGE_URL } from "@/lib/media";
import {
  DIGISOL_EMAIL,
  DIGISOL_FOUNDER,
  DIGISOL_FOUNDER_TITLE,
  DIGISOL_PHONE,
  DIGISOL_SITE_URL,
} from "@/lib/site";

export type AuditFollowUpSource = "prospect_audit" | "visitor_chat";

export type AuditFollowUpInput = {
  db: SupabaseClient;
  clientId: string;
  email: string;
  name?: string | null;
  company?: string | null;
  url: string;
  score: number;
  summary: string;
  weaknesses: string[];
  strengths?: string[];
  opener?: string;
  subject?: string;
  source: AuditFollowUpSource;
  /** When true, skip Resend and only upsert contact/lead. */
  dryRun?: boolean;
};

export type ConsultationFollowUpInput = {
  db: SupabaseClient;
  clientId: string;
  email: string;
  name?: string | null;
  company?: string | null;
  phone?: string | null;
  requirements?: string | null;
  leadType?: string | null;
  dryRun?: boolean;
};

type ScoreTier = "strong" | "solid" | "needs_work";

function scoreTier(score: number): ScoreTier {
  if (score >= 80) return "strong";
  if (score >= 60) return "solid";
  return "needs_work";
}

/**
 * Soft audit breakdown email: findings + product ideas (no pricing) +
 * Cameron consultation CTA. Used by daily prospect cron and Kaylev chat.
 */
export async function sendAuditFollowUpEmail(input: AuditFollowUpInput) {
  const contact = await findOrCreateContactForSend(input.db, {
    email: input.email,
    clientId: input.clientId,
    companyName: input.company || undefined,
  });

  const { data: existing } = await input.db
    .from("contacts")
    .select("id, tags, name, company, source, phone")
    .eq("id", contact.id)
    .maybeSingle();

  const sourceTag =
    input.source === "visitor_chat" ? "visitor_chat" : "prospect_audit";
  const tier = scoreTier(input.score);
  const tags = Array.from(
    new Set([
      ...((existing?.tags as string[] | null) ?? []),
      "lead",
      sourceTag,
      "audit_followup",
      ...(input.source === "prospect_audit" ? ["cold_prospect"] : []),
      ...(tier === "strong" ? ["audit_strong"] : []),
      ...(tier === "needs_work" ? ["audit_needs_work"] : []),
    ]),
  );

  await input.db
    .from("contacts")
    .update({
      tags,
      name: existing?.name || input.name || null,
      company: existing?.company || input.company || null,
      source:
        existing?.source === "manual"
          ? existing.source
          : input.source === "visitor_chat"
            ? "visitor_chat"
            : "prospect_audit",
      notes_preview:
        `Audit follow-up · score ${input.score}/100 · ${input.url}`.slice(
          0,
          280,
        ),
      client_id: input.clientId,
    })
    .eq("id", contact.id);

  await ensurePipelineLead({
    db: input.db,
    clientId: input.clientId,
    contactId: contact.id,
    name: existing?.name || input.name || null,
    email: contact.email,
    company: existing?.company || input.company || null,
    phone: existing?.phone || null,
    url: input.url,
    score: input.score,
    summary: input.summary,
    source: input.source,
    service: "Website audit",
    activityBody: `Created from ${input.source} audit follow-up (${input.score}/100).`,
    advanceTo: "contacted",
  });

  const subject =
    input.subject?.trim() || defaultAuditSubject(input.score, input.source);

  const html = buildAuditFollowUpHtml({
    opener:
      input.opener ||
      defaultAuditOpener({
        score: input.score,
        name: input.name,
        source: input.source,
      }),
    summary: input.summary,
    url: input.url,
    score: input.score,
    weaknesses: input.weaknesses,
    strengths: input.strengths,
    source: input.source,
  });

  if (input.dryRun || !getResendApiKey()) {
    return {
      contactId: contact.id,
      sendId: undefined as string | undefined,
      resendId: undefined as string | undefined,
      emailed: false,
      reason: input.dryRun ? "dry_run" : "missing_resend_key",
    };
  }

  const sent = await sendEmailToContact({
    contactId: contact.id,
    contact: {
      id: contact.id,
      email: contact.email,
      name: existing?.name || input.name || contact.name,
      company: existing?.company || input.company || contact.company,
      unsubscribed_at: contact.unsubscribed_at,
    },
    db: input.db,
    clientId: input.clientId,
    companyName: DIGISOL_HOUSE_NAME,
    brand: DIGISOL_BRAND,
    subject,
    html,
  });

  return {
    contactId: contact.id,
    sendId: sent.sendId as string | undefined,
    resendId: sent.resendId as string | undefined,
    emailed: true,
  };
}

export function buildAuditFollowUpHtml(input: {
  opener: string;
  summary: string;
  url: string;
  score: number;
  weaknesses: string[];
  strengths?: string[];
  source: AuditFollowUpSource;
}) {
  const tier = scoreTier(input.score);
  const weaknessHtml = (input.weaknesses.length
    ? input.weaknesses
    : tier === "strong"
      ? [
          "Keep measuring what converts (forms, calls, booked consults)",
          "Protect speed and mobile clarity as you add content",
        ]
      : [
          "Clarify the primary call-to-action",
          "Tighten page speed and SEO basics",
        ]
  )
    .slice(0, 5)
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");

  const strengthItems = (input.strengths || []).filter(Boolean).slice(0, 4);
  const strengthHtml =
    strengthItems.length > 0
      ? `<p><strong>What's working:</strong></p><ul>${strengthItems
          .map((item) => `<li>${escapeHtml(item)}</li>`)
          .join("")}</ul>`
      : "";

  const products = suggestProducts(input.score, input.weaknesses);
  const productHtml = products
    .map(
      (p) =>
        `<li><strong>${escapeHtml(p.name)}</strong> — ${escapeHtml(p.blurb)}</li>`,
    )
    .join("");

  const consultUrl = `${DIGISOL_SITE_URL}/#contact`;
  const pricingUrl =
    tier === "strong"
      ? `${DIGISOL_SITE_URL}/pricing?view=strong#growth`
      : `${DIGISOL_SITE_URL}/pricing`;
  const videoPageUrl = WEBSITE_AUDIT_PAGE_URL;

  const scoreFrame =
    tier === "strong"
      ? `<p><strong>Score:</strong> ${input.score}/100 for ${escapeHtml(input.url)} — this is a strong result. An audit that lands here should still create value: DigiSol Hub keeps leads, nurture, and follow-ups working so the site's strength turns into booked conversations.</p>`
      : tier === "solid"
        ? `<p><strong>Quick score:</strong> ${input.score}/100 for ${escapeHtml(input.url)} — solid baseline, with a short list of upgrades that usually pay off first.</p>`
        : `<p><strong>Quick score:</strong> ${input.score}/100 for ${escapeHtml(input.url)} — the list below is what we'd tackle first.</p>`;

  const fixHeading =
    tier === "strong"
      ? "Keep these sharp (even strong sites slip here):"
      : "Breakdown — worth fixing first:";

  const hubPitch =
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
        : `<p><a href="${pricingUrl}">See DigiSol pricing</a> — website packages, Hub, and monthly growth.</p>`;

  const casl =
    input.source === "visitor_chat"
      ? `You are receiving this because you requested a DigiSol website audit.`
      : `You are receiving this because your business contact address is published on your website and this note relates to your online presence.`;

  return `
<p>${escapeHtml(input.opener)}</p>
<p>${escapeHtml(input.summary)}</p>
${scoreFrame}
${strengthHtml}
<p><strong>${fixHeading}</strong></p>
<ul>${weaknessHtml}</ul>
<p><strong>Watch the DigiSol website audit presentation</strong> (what we look for in design, speed, local SEO, and conversion):<br/>
<a href="${videoPageUrl}">${escapeHtml(videoPageUrl)}</a></p>
<p><strong>Ways DigiSol can help (no obligation):</strong></p>
<ul>${productHtml}</ul>
${hubPitch}
<p>If you want a direct walkthrough, ${escapeHtml(DIGISOL_FOUNDER)} (${escapeHtml(DIGISOL_FOUNDER_TITLE)}) is happy to hop on a short consultation — no hard sell, just clarity on what would move the needle${tier === "strong" ? " (including whether Hub alone is the right next step)" : " for your site"}.</p>
<p><a href="${consultUrl}">Book a consultation</a> · <a href="${pricingUrl}">Pricing</a> · ${escapeHtml(DIGISOL_PHONE)} · <a href="mailto:${DIGISOL_EMAIL}">${escapeHtml(DIGISOL_EMAIL)}</a></p>
<p style="color:#71717a;font-size:12px;">${casl} DigiSol · Alberta, Canada. Reply to unsubscribe anytime.</p>
`.trim();
}

function defaultAuditSubject(score: number, source: AuditFollowUpSource) {
  const tier = scoreTier(score);
  if (source === "visitor_chat") {
    if (tier === "strong") {
      return `Your DigiSol audit — ${score}/100 (solid site) + DigiSol Hub`;
    }
    return `Your DigiSol website audit — ${score}/100`;
  }
  if (tier === "strong") {
    return `Your site scored ${score}/100 — keep the wins with DigiSol Hub`;
  }
  if (tier === "solid") {
    return `A quick look at your website (${score}/100)`;
  }
  return `A few fixes that would help your website`;
}

function defaultAuditOpener(opts: {
  score: number;
  name?: string | null;
  source: AuditFollowUpSource;
}) {
  const first = opts.name?.trim().split(/\s+/)[0] || "";
  const hi =
    opts.source === "visitor_chat"
      ? `Hi${first ? ` ${first}` : ""} — thanks for requesting a DigiSol website audit.`
      : `Hey${first ? ` ${first}` : ""} — I took a quick look at your site.`;
  const tier = scoreTier(opts.score);
  if (tier === "strong") {
    return `${hi} Good news: it already scores well (${opts.score}/100). The opportunity now is turning that traffic into booked work and keeping follow-ups organized.`;
  }
  if (tier === "solid") {
    return `${hi} You're in decent shape (${opts.score}/100) with a few clear upgrades that would help more visitors take action.`;
  }
  return `${hi} There's real room to improve how the site loads, ranks locally, and converts visitors into calls.`;
}

function suggestProducts(score: number, weaknesses: string[]) {
  const joined = weaknesses.join(" ").toLowerCase();
  const tier = scoreTier(score);
  const picks: Array<{ name: string; blurb: string }> = [];

  if (tier === "strong") {
    picks.push({
      name: "DigiSol Hub workspace",
      blurb:
        "Your site is in good shape — Hub turns visitors into tracked leads, nurture sequences, and booked consults without another spreadsheet.",
    });
    picks.push({
      name: "Conversion polish",
      blurb:
        "Light CRO on CTAs and forms so a strong site books more work from the traffic you already earn.",
    });
    picks.push({
      name: "Ongoing growth coaching",
      blurb:
        "Listings, reviews, and Hub workflows kept current so the score stays high and leads keep moving.",
    });
    return picks.slice(0, 3);
  }

  if (
    score < 70 ||
    /speed|ttfb|https|mobile|performance|core web/i.test(joined)
  ) {
    picks.push({
      name: "Foundation website build",
      blurb:
        "A clean, fast Next.js site that loads well on mobile and captures leads into DigiSol Hub.",
    });
  }

  if (/seo|title|meta|schema|local|google|nap|listing/i.test(joined) || score < 75) {
    picks.push({
      name: "Local SEO & discovery",
      blurb:
        "Help nearby customers find you — listings, on-page SEO, and clearer service pages for Alberta search.",
    });
  }

  if (/cta|convert|form|contact|call-to-action|conversion/i.test(joined)) {
    picks.push({
      name: "Conversion paths",
      blurb:
        "Clearer CTAs, forms, and follow-up so visitors become booked conversations.",
    });
  }

  picks.push({
    name: "DigiSol Hub",
    blurb:
      "Keep contacts, nurture emails, and audit follow-ups in one place so nothing falls through — even while the site is being improved.",
  });

  return picks.slice(0, 3);
}

/**
 * Free consultation invite for Kaylev visitors with no site / cost questions.
 * Upserts contact + pipeline lead, then emails Cameron booking CTA.
 */
export async function sendConsultationFollowUpEmail(
  input: ConsultationFollowUpInput,
) {
  const contact = await findOrCreateContactForSend(input.db, {
    email: input.email,
    clientId: input.clientId,
    companyName: input.company || undefined,
  });

  const { data: existing } = await input.db
    .from("contacts")
    .select("id, tags, name, company, source, phone")
    .eq("id", contact.id)
    .maybeSingle();

  const tags = Array.from(
    new Set([
      ...((existing?.tags as string[] | null) ?? []),
      "lead",
      "visitor_chat",
      "consultation",
      "consultation_followup",
    ]),
  );

  const requirements = (input.requirements || "").trim();
  await input.db
    .from("contacts")
    .update({
      tags,
      name: existing?.name || input.name || null,
      company: existing?.company || input.company || null,
      phone: existing?.phone || input.phone || null,
      source:
        existing?.source === "manual" ? existing.source : "visitor_chat",
      service: "Free consultation",
      notes_preview: (
        requirements ||
        "Requested free consultation via Kaylev chat"
      ).slice(0, 280),
      client_id: input.clientId,
    })
    .eq("id", contact.id);

  await ensurePipelineLead({
    db: input.db,
    clientId: input.clientId,
    contactId: contact.id,
    name: existing?.name || input.name || null,
    email: contact.email,
    company: existing?.company || input.company || null,
    phone: existing?.phone || input.phone || null,
    url: "",
    score: 0,
    summary: requirements || "Free consultation request",
    source: "visitor_chat",
    service: "Free consultation",
    activityBody: "Created from Kaylev free consultation invite.",
    advanceTo: "contacted",
  });

  const first = (input.name || "").trim().split(/\s+/)[0] || "";
  const consultUrl = `${DIGISOL_SITE_URL}/#contact`;
  const subject = "Your free DigiSol consultation";
  const html = `
<p>Hi${first ? ` ${escapeHtml(first)}` : ""} — thanks for chatting with Kaylev on DigiSol.</p>
<p>You asked about next steps${requirements ? ` (${escapeHtml(requirements.slice(0, 180))})` : ""} — and you do not need to figure out every detail alone. ${escapeHtml(DIGISOL_FOUNDER)} (${escapeHtml(DIGISOL_FOUNDER_TITLE)}) offers a <strong>free consultation</strong>: a short, no-pressure call to clarify what would help your business grow online.</p>
<p><a href="${consultUrl}">Book your free consultation</a></p>
<p>Or reach Cameron directly: ${escapeHtml(DIGISOL_PHONE)} · <a href="mailto:${DIGISOL_EMAIL}">${escapeHtml(DIGISOL_EMAIL)}</a></p>
<p style="color:#71717a;font-size:12px;">You are receiving this because you requested a DigiSol consultation via Kaylev. DigiSol · Alberta, Canada. Reply to unsubscribe anytime.</p>
`.trim();

  if (input.dryRun || !getResendApiKey()) {
    return {
      contactId: contact.id,
      sendId: undefined as string | undefined,
      resendId: undefined as string | undefined,
      emailed: false,
      reason: input.dryRun ? "dry_run" : "missing_resend_key",
    };
  }

  const sent = await sendEmailToContact({
    contactId: contact.id,
    contact: {
      id: contact.id,
      email: contact.email,
      name: existing?.name || input.name || contact.name,
      company: existing?.company || input.company || contact.company,
      unsubscribed_at: contact.unsubscribed_at,
    },
    db: input.db,
    clientId: input.clientId,
    companyName: DIGISOL_HOUSE_NAME,
    brand: DIGISOL_BRAND,
    subject,
    html,
  });

  return {
    contactId: contact.id,
    sendId: sent.sendId as string | undefined,
    resendId: sent.resendId as string | undefined,
    emailed: true,
  };
}

async function ensurePipelineLead(input: {
  db: SupabaseClient;
  clientId: string;
  contactId: string;
  name: string | null;
  email: string;
  company: string | null;
  phone: string | null;
  url: string;
  score: number;
  summary: string;
  source: AuditFollowUpSource;
  service?: string;
  activityBody?: string;
  advanceTo?: "new" | "contacted" | "qualified";
}) {
  try {
    const service = input.service || "Website audit";
    const notes =
      input.score > 0
        ? `Audit ${input.score}/100 · ${input.url} · ${(input.summary || "").slice(0, 160)}`.slice(
            0,
            280,
          )
        : (input.summary || service).slice(0, 280);
    const stage = input.advanceTo || "new";

    const { data: existingLead } = await input.db
      .from("leads")
      .select("id, stage")
      .eq("contact_id", input.contactId)
      .eq("client_id", input.clientId)
      .maybeSingle();

    if (existingLead?.id) {
      await input.db
        .from("leads")
        .update({
          notes_preview: notes,
          service,
          stage:
            existingLead.stage === "new" || !existingLead.stage
              ? stage
              : existingLead.stage,
        })
        .eq("id", existingLead.id);

      await input.db.from("lead_activities").insert({
        lead_id: existingLead.id,
        type: "note",
        body:
          input.activityBody ||
          `Kaylev follow-up · ${service} · ${notes}`.slice(0, 500),
        to_stage:
          existingLead.stage === "new" || !existingLead.stage
            ? stage
            : existingLead.stage,
      });
      return;
    }

    const { data: lead } = await input.db
      .from("leads")
      .insert({
        contact_id: input.contactId,
        client_id: input.clientId,
        name: input.name || input.company,
        email: input.email,
        phone: input.phone,
        company: input.company,
        service,
        source:
          input.source === "visitor_chat" ? "website" : "prospect_audit",
        channel: input.source === "visitor_chat" ? "visitor_chat" : "email",
        stage,
        notes_preview: notes,
      })
      .select("id")
      .maybeSingle();

    if (lead?.id) {
      await input.db.from("lead_activities").insert({
        lead_id: lead.id,
        type: "created",
        body:
          input.activityBody ||
          `Created from ${input.source} · ${service}.`,
        to_stage: stage,
      });
    }
  } catch (err) {
    console.warn(
      "[audit-followup] pipeline lead skipped",
      err instanceof Error ? err.message : err,
    );
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
