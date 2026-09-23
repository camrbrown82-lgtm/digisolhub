import type { SupabaseClient } from "@supabase/supabase-js";
import { DIGISOL_BRAND, DIGISOL_HOUSE_NAME } from "@/lib/branding";
import {
  findOrCreateContactForSend,
  getResendApiKey,
  sendEmailToContact,
} from "@/lib/email";
import {
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
  opener?: string;
  subject?: string;
  source: AuditFollowUpSource;
  /** When true, skip Resend and only upsert contact/lead. */
  dryRun?: boolean;
};

/**
 * Soft audit breakdown email: findings + product ideas (no pricing) +
 * Cameron consultation CTA. Used by daily prospect cron and Caleb visitor chat.
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
  const tags = Array.from(
    new Set([
      ...((existing?.tags as string[] | null) ?? []),
      "lead",
      sourceTag,
      "audit_followup",
      ...(input.source === "prospect_audit" ? ["cold_prospect"] : []),
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
  });

  const subject =
    input.subject?.trim() ||
    (input.source === "visitor_chat"
      ? `Your DigiSol website audit — ${input.score}/100`
      : `A quick look at your website`);

  const html = buildAuditFollowUpHtml({
    opener:
      input.opener ||
      (input.source === "visitor_chat"
        ? `Hi${input.name ? ` ${escapeHtml(input.name.split(" ")[0])}` : ""} — thanks for requesting a DigiSol website audit.`
        : "Hey — I took a quick look at your site."),
    summary: input.summary,
    url: input.url,
    score: input.score,
    weaknesses: input.weaknesses,
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
  source: AuditFollowUpSource;
}) {
  const weaknessHtml = (input.weaknesses.length
    ? input.weaknesses
    : ["Clarify the primary call-to-action", "Tighten page speed and SEO basics"]
  )
    .slice(0, 5)
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");

  const products = suggestProducts(input.score, input.weaknesses);
  const productHtml = products
    .map(
      (p) =>
        `<li><strong>${escapeHtml(p.name)}</strong> — ${escapeHtml(p.blurb)}</li>`,
    )
    .join("");

  const consultUrl = `${DIGISOL_SITE_URL}/#contact`;
  const casl =
    input.source === "visitor_chat"
      ? `You are receiving this because you requested a DigiSol website audit.`
      : `You are receiving this because your business contact address is published on your website and this note relates to your online presence.`;

  return `
<p>${escapeHtml(input.opener)}</p>
<p>${escapeHtml(input.summary)}</p>
<p><strong>Quick score:</strong> ${input.score}/100 for ${escapeHtml(input.url)}</p>
<p><strong>Breakdown — worth fixing first:</strong></p>
<ul>${weaknessHtml}</ul>
<p><strong>Ways DigiSol can help (no obligation):</strong></p>
<ul>${productHtml}</ul>
<p>If you want a direct walkthrough, ${escapeHtml(DIGISOL_FOUNDER)} (${escapeHtml(DIGISOL_FOUNDER_TITLE)}) is happy to hop on a short consultation — no hard sell, just clarity on what would move the needle for your site.</p>
<p><a href="${consultUrl}">Book a consultation</a> · ${escapeHtml(DIGISOL_PHONE)} · <a href="mailto:cam.r.brown82@gmail.com">cam.r.brown82@gmail.com</a></p>
<p style="color:#71717a;font-size:12px;">${casl} DigiSol · Alberta, Canada. Reply to unsubscribe anytime.</p>
`.trim();
}

function suggestProducts(score: number, weaknesses: string[]) {
  const joined = weaknesses.join(" ").toLowerCase();
  const picks: Array<{ name: string; blurb: string }> = [];

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
      "Keep contacts, nurture emails, and audit follow-ups in one place so nothing falls through.",
  });

  // Cap soft sell to three ideas.
  return picks.slice(0, 3);
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
}) {
  try {
    const { data: existingLead } = await input.db
      .from("leads")
      .select("id")
      .eq("contact_id", input.contactId)
      .eq("client_id", input.clientId)
      .maybeSingle();

    if (existingLead) return;

    const { data: lead } = await input.db
      .from("leads")
      .insert({
        contact_id: input.contactId,
        client_id: input.clientId,
        name: input.name || input.company,
        email: input.email,
        phone: input.phone,
        company: input.company,
        service: "Website audit",
        source:
          input.source === "visitor_chat" ? "website" : "prospect_audit",
        channel: input.source === "visitor_chat" ? "visitor_chat" : "email",
        stage: "new",
        notes_preview:
          `Audit ${input.score}/100 · ${input.url} · ${(input.summary || "").slice(0, 160)}`.slice(
            0,
            280,
          ),
      })
      .select("id")
      .maybeSingle();

    if (lead?.id) {
      await input.db.from("lead_activities").insert({
        lead_id: lead.id,
        type: "created",
        body: `Created from ${input.source} audit follow-up (${input.score}/100).`,
        to_stage: "new",
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
