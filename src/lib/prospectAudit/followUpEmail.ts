import type { SupabaseClient } from "@supabase/supabase-js";
import { DIGISOL_BRAND, DIGISOL_HOUSE_NAME } from "@/lib/branding";
import {
  findOrCreateContactForSend,
  getResendApiKey,
  sendEmailToContact,
} from "@/lib/email";
import { ensureMetaSchema } from "@/lib/ensureMetaSchema";
import { DEFAULT_LOCALE, localizePath, type Locale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";
import { translateLines } from "@/lib/i18n/translate";
import { WEBSITE_AUDIT_PAGE_URL } from "@/lib/media";
import {
  DIGISOL_EMAIL,
  DIGISOL_FOUNDER,
  DIGISOL_FOUNDER_TITLE,
  DIGISOL_GOOGLE_REVIEW_URL,
  DIGISOL_PHONE,
  DIGISOL_SITE_URL,
} from "@/lib/site";
import { FREE_AUDIT_TAG } from "@/lib/workflowGraph";
import { AWARD_MIN_SCORE, awardLinks } from "@/lib/websiteAward";

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
  /** Email language; audit findings are machine-translated when not English. */
  language?: Locale;
  /**
   * Award id for a site scoring AWARD_MIN_SCORE+. The email then leads with the Excellence Award badge.
   * Prospect outreach is English only. A homepage audit uses the website_audits id.
   */
  awardId?: string;
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
  language?: Locale;
  dryRun?: boolean;
};

const siteUrl = (path: string, language: Locale) => `${DIGISOL_SITE_URL}${localizePath(path, language)}`;

const INSTANT_EMAIL_GAP_MS = 24 * 60 * 60 * 1000;

/**
 * Kaylev can fire its capture and email tools in parallel for the same visitor.
 * The conditional update is atomic, so only one of them wins the right to email.
 */
async function claimInstantEmail(db: SupabaseClient, contactId: string) {
  await ensureMetaSchema().catch(() => null);
  const now = new Date();
  const cutoff = new Date(now.getTime() - INSTANT_EMAIL_GAP_MS).toISOString();
  const { data, error } = await db
    .from("contacts")
    .update({ instant_email_at: now.toISOString() })
    .eq("id", contactId)
    .or(`instant_email_at.is.null,instant_email_at.lt."${cutoff}"`)
    .select("id");
  if (error) return true;
  return (data ?? []).length > 0;
}

async function releaseInstantEmail(db: SupabaseClient, contactId: string) {
  await db
    .from("contacts")
    .update({ instant_email_at: null })
    .eq("id", contactId)
    .then(
      () => null,
      () => null,
    );
}

const ALREADY_EMAILED = {
  emailed: false,
  reason: "already_emailed_recently: this visitor got a DigiSol email in the last 24 hours, so no second copy was sent",
} as const;

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
  const language = input.language ?? DEFAULT_LOCALE;
  const tier = scoreTier(input.score);
  const award =
    input.awardId &&
    input.score >= AWARD_MIN_SCORE &&
    (input.source === "visitor_chat" ||
      (input.source === "prospect_audit" && language === DEFAULT_LOCALE))
      ? { id: input.awardId, companyName: input.company?.trim() || hostOf(input.url) }
      : undefined;
  const tags = Array.from(
    new Set([
      ...((existing?.tags as string[] | null) ?? []),
      "lead",
      sourceTag,
      "audit_followup",
      ...(input.source === "visitor_chat" ? [FREE_AUDIT_TAG] : []),
      ...(input.source === "prospect_audit" ? ["cold_prospect"] : []),
      ...(tier === "strong" ? ["audit_strong"] : []),
      ...(award ? ["award_winner"] : []),
      ...(tier === "needs_work" ? ["audit_needs_work"] : []),
      ...(language !== DEFAULT_LOCALE ? [`lang:${language}`] : []),
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

  const t = getMessages(language).emails;
  const subject = award
    ? `${award.companyName}, your website earned the DigiSol Excellence Award (${input.score}/100)`
    : input.subject?.trim() || t.auditSubject(input.score, input.source, tier);

  const strengths = (input.strengths || []).filter(Boolean).slice(0, 4);
  const weaknesses = input.weaknesses.slice(0, 5);
  let summary = input.summary;
  let opener = input.opener;
  if (language !== DEFAULT_LOCALE && !input.dryRun) {
    const lines = [summary, ...weaknesses, ...strengths, ...(opener ? [opener] : [])];
    const translated = await translateLines(lines, language);
    summary = translated[0];
    weaknesses.splice(0, weaknesses.length, ...translated.slice(1, 1 + weaknesses.length));
    const strengthStart = 1 + weaknesses.length;
    strengths.splice(0, strengths.length, ...translated.slice(strengthStart, strengthStart + strengths.length));
    if (opener) opener = translated[translated.length - 1];
  }

  const html = buildAuditFollowUpHtml({
    opener:
      opener ||
      defaultAuditOpener({
        score: input.score,
        name: input.name,
        source: input.source,
        language,
      }),
    summary,
    url: input.url,
    score: input.score,
    weaknesses,
    strengths,
    source: input.source,
    language,
    award,
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

  const fromChat = input.source === "visitor_chat";
  if (fromChat && !(await claimInstantEmail(input.db, contact.id))) {
    return {
      contactId: contact.id,
      sendId: undefined as string | undefined,
      resendId: undefined as string | undefined,
      ...ALREADY_EMAILED,
    };
  }

  let sent: Awaited<ReturnType<typeof sendEmailToContact>>;
  try {
    sent = await sendEmailToContact({
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
  } catch (error) {
    if (fromChat) await releaseInstantEmail(input.db, contact.id);
    throw error;
  }

  return {
    contactId: contact.id,
    sendId: sent.sendId as string | undefined,
    resendId: sent.resendId as string | undefined,
    emailed: true,
    awardIncluded: Boolean(award),
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
  language?: Locale;
  award?: { id: string; companyName: string };
}) {
  if (input.award) return buildAwardFirstEmailHtml({ ...input, award: input.award });
  const language = input.language ?? DEFAULT_LOCALE;
  const t = getMessages(language).emails;
  const tier = scoreTier(input.score);
  const weaknessHtml = (input.weaknesses.length
    ? input.weaknesses
    : tier === "strong"
      ? t.fallbackWeaknessesStrong
      : t.fallbackWeaknesses
  )
    .slice(0, 5)
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");

  const strengthItems = (input.strengths || []).filter(Boolean).slice(0, 4);
  const strengthHtml =
    strengthItems.length > 0
      ? `<p><strong>${escapeHtml(t.strengthsHeading)}</strong></p><ul>${strengthItems
          .map((item) => `<li>${escapeHtml(item)}</li>`)
          .join("")}</ul>`
      : "";

  const products = suggestProducts(input.score, input.weaknesses, language);
  const productHtml = products
    .map(
      (p) =>
        `<li><strong>${escapeHtml(p.name)}</strong> — ${escapeHtml(p.blurb)}</li>`,
    )
    .join("");

  const consultUrl = siteUrl("/#contact", language);
  const pricingUrl =
    tier === "strong"
      ? siteUrl("/pricing?view=strong#growth", language)
      : siteUrl("/pricing", language);
  const videoPageUrl = WEBSITE_AUDIT_PAGE_URL;

  return `
<p>${escapeHtml(input.opener)}</p>
<p>${escapeHtml(input.summary)}</p>
${t.scoreFrame(tier, input.score, escapeHtml(input.url))}
${strengthHtml}
<p><strong>${escapeHtml(t.fixHeading(tier))}</strong></p>
<ul>${weaknessHtml}</ul>
<p><strong>${escapeHtml(t.videoIntro)}</strong> ${escapeHtml(t.videoDetail)}<br/>
<a href="${videoPageUrl}">${escapeHtml(videoPageUrl)}</a></p>
<p><strong>${escapeHtml(t.helpHeading)}</strong></p>
<ul>${productHtml}</ul>
${t.hubPitch(tier, pricingUrl)}
<p>${t.consultLine(escapeHtml(DIGISOL_FOUNDER), escapeHtml(DIGISOL_FOUNDER_TITLE), tier === "strong")}</p>
<p><a href="${consultUrl}">${escapeHtml(t.bookConsult)}</a> · <a href="${pricingUrl}">${escapeHtml(t.pricing)}</a> · ${escapeHtml(DIGISOL_PHONE)} · <a href="mailto:${DIGISOL_EMAIL}">${escapeHtml(DIGISOL_EMAIL)}</a></p>
<p style="color:#71717a;font-size:12px;">${escapeHtml(t.casl(input.source))} ${escapeHtml(t.footer)}</p>
`.trim();
}

const emailButton = (href: string, label: string, primary: boolean) =>
  `<a href="${escapeHtml(href)}" style="display:inline-block;padding:14px 26px;border-radius:12px;font-weight:700;font-size:15px;text-decoration:none;${
    primary
      ? `background:${DIGISOL_BRAND.primaryColor};color:#ffffff;`
      : "background:#ffffff;color:#0f172a;border:1px solid #cbd5e1;"
  }">${escapeHtml(label)}</a>`;

/**
 * First outreach email for a prospect whose site earned the Excellence Award: the badge and an
 * "add it to your site" CTA come first, then the audit notes, then optional offers.
 */
function buildAwardFirstEmailHtml(input: {
  opener: string;
  summary: string;
  score: number;
  weaknesses: string[];
  strengths?: string[];
  source: AuditFollowUpSource;
  award: { id: string; companyName: string };
}) {
  const t = getMessages(DEFAULT_LOCALE).emails;
  const links = awardLinks(DIGISOL_SITE_URL, input.award.id);
  const company = escapeHtml(input.award.companyName);
  const list = (items: string[]) =>
    `<ul style="padding-left:20px;margin:0 0 16px">${items
      .map((item) => `<li style="margin-bottom:6px">${escapeHtml(item)}</li>`)
      .join("")}</ul>`;
  const strengths = (input.strengths || []).filter(Boolean).slice(0, 4);
  const polish = (input.weaknesses.length ? input.weaknesses : t.fallbackWeaknessesStrong).slice(0, 3);
  const products = suggestProducts(input.score, input.weaknesses, DEFAULT_LOCALE);
  const pricingUrl = siteUrl("/pricing?view=strong#growth", DEFAULT_LOCALE);
  const consultUrl = siteUrl("/#contact", DEFAULT_LOCALE);

  return `
<div style="display:none;max-height:0;overflow:hidden">Your site scored ${input.score}/100 and earned the DigiSol Excellence Award. Your badge is ready to add.</div>
<p>${escapeHtml(input.opener)}</p>
<p><strong>${company}'s website scored ${input.score}/100</strong> on our website audit. Sites that score ${AWARD_MIN_SCORE} or higher earn the <strong>DigiSol Excellence Award</strong>, and yours made it.</p>
<p style="text-align:center;margin:28px 0">
  <a href="${escapeHtml(links.add)}"><img src="${escapeHtml(links.badgePng)}" width="320" height="120" alt="DigiSol Excellence Award: ${company}, ${input.score}/100" style="border:0;max-width:100%"></a>
</p>
<p><strong>Why put it on your site?</strong></p>
${list([
  "Visitors see at a glance that your site passed an outside check for speed, security and SEO.",
  "It adds trust right where people decide whether to call you or book.",
  "It stays honest. The badge links to a live verification page with your score and date.",
])}
<p style="text-align:center;margin:28px 0">${emailButton(links.add, "Add my badge (2 minutes)", true)}</p>
<p style="font-size:13px;color:#475569">Someone else runs your website? Forward them this email. The page has copy-paste code and steps for WordPress, Wix, Squarespace and Shopify.</p>
<hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0">
<p><strong>From the audit</strong></p>
<p>${escapeHtml(input.summary)}</p>
${strengths.length ? `<p><strong>${escapeHtml(t.strengthsHeading)}</strong></p>${list(strengths)}` : ""}
<p><strong>${escapeHtml(t.fixHeading("strong"))}</strong></p>
${list(polish)}
<hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0">
<p><strong>If you'd like to take a look</strong></p>
<p>No pressure at all. A great site is the hard part. These are the ways we help businesses turn that into more calls and bookings:</p>
<ul style="padding-left:20px;margin:0 0 16px">${products
    .map((p) => `<li style="margin-bottom:6px"><strong>${escapeHtml(p.name)}</strong> — ${escapeHtml(p.blurb)}</li>`)
    .join("")}</ul>
<p style="margin:20px 0">${emailButton(pricingUrl, "See plans for strong sites", false)}</p>
<p>${t.consultLine(escapeHtml(DIGISOL_FOUNDER), escapeHtml(DIGISOL_FOUNDER_TITLE), true)}</p>
<p><a href="${consultUrl}">${escapeHtml(t.bookConsult)}</a> · ${escapeHtml(DIGISOL_PHONE)} · <a href="mailto:${DIGISOL_EMAIL}">${escapeHtml(DIGISOL_EMAIL)}</a></p>
<p style="font-size:13px;color:#475569"><strong>P.S.</strong> If the audit was useful, a quick <a href="${escapeHtml(DIGISOL_GOOGLE_REVIEW_URL)}">Google review</a> helps other local businesses find us. The award is yours either way.</p>
<p>Congratulations again,<br>${escapeHtml(DIGISOL_FOUNDER)}<br>DigiSol</p>
<p style="color:#71717a;font-size:12px;">${escapeHtml(t.casl(input.source))} ${escapeHtml(t.footer)}</p>
`.trim();
}

function hostOf(url: string) {
  try {
    return new URL(url.includes("://") ? url : `https://${url}`).hostname.replace(/^www\./i, "");
  } catch {
    return url;
  }
}

function defaultAuditOpener(opts: {
  score: number;
  name?: string | null;
  source: AuditFollowUpSource;
  language: Locale;
}) {
  const first = opts.name?.trim().split(/\s+/)[0] || "";
  return getMessages(opts.language).emails.auditOpener({
    score: opts.score,
    first,
    source: opts.source,
    tier: scoreTier(opts.score),
  });
}

function suggestProducts(score: number, weaknesses: string[], language: Locale) {
  const products = getMessages(language).emails.products;
  const joined = weaknesses.join(" ").toLowerCase();
  const tier = scoreTier(score);
  const picks: Array<{ name: string; blurb: string }> = [];

  if (tier === "strong") {
    picks.push(products.hubWorkspace, products.conversionPolish, products.growthCoaching);
    return picks.slice(0, 3);
  }

  if (
    score < 70 ||
    /speed|ttfb|https|mobile|performance|core web|vitesse|mobile/i.test(joined)
  ) {
    picks.push(products.foundation);
  }

  if (/seo|title|titre|meta|schema|local|google|nap|listing|fiche/i.test(joined) || score < 75) {
    picks.push(products.localSeo);
  }

  if (/cta|convert|form|contact|call-to-action|conversion|appel à l/i.test(joined)) {
    picks.push(products.conversionPaths);
  }

  picks.push(products.hub);

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

  const language = input.language ?? DEFAULT_LOCALE;
  const tags = Array.from(
    new Set([
      ...((existing?.tags as string[] | null) ?? []),
      "lead",
      "visitor_chat",
      "consultation",
      "consultation_followup",
      ...(language !== DEFAULT_LOCALE ? [`lang:${language}`] : []),
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
  const consultUrl = siteUrl("/#contact", language);
  const t = getMessages(language).emails;
  const subject = t.consultSubject;
  const html = `
<p>${escapeHtml(t.consultHi(first))}</p>
<p>${t.consultBody(escapeHtml(requirements.slice(0, 180)), escapeHtml(DIGISOL_FOUNDER), escapeHtml(DIGISOL_FOUNDER_TITLE))}</p>
<p><a href="${consultUrl}">${escapeHtml(t.consultCta)}</a></p>
<p>${escapeHtml(t.consultDirect)} ${escapeHtml(DIGISOL_PHONE)} · <a href="mailto:${DIGISOL_EMAIL}">${escapeHtml(DIGISOL_EMAIL)}</a></p>
<p style="color:#71717a;font-size:12px;">${escapeHtml(t.consultCasl)}</p>
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

  if (!(await claimInstantEmail(input.db, contact.id))) {
    return {
      contactId: contact.id,
      sendId: undefined as string | undefined,
      resendId: undefined as string | undefined,
      ...ALREADY_EMAILED,
    };
  }

  let sent: Awaited<ReturnType<typeof sendEmailToContact>>;
  try {
    sent = await sendEmailToContact({
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
  } catch (error) {
    await releaseInstantEmail(input.db, contact.id);
    throw error;
  }

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
