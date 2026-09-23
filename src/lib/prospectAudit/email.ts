import type { SupabaseClient } from "@supabase/supabase-js";
import { DIGISOL_BRAND, DIGISOL_HOUSE_NAME } from "@/lib/branding";
import {
  findOrCreateContactForSend,
  sendEmailToContact,
} from "@/lib/email";
import type { ProspectAuditSummary } from "@/lib/prospectAudit/summary";

export async function sendProspectAuditEmail(input: {
  db: SupabaseClient;
  clientId: string;
  prospectId: string;
  businessName?: string | null;
  email: string;
  trade: string;
  url: string;
  score: number;
  summary: ProspectAuditSummary;
}) {
  const contact = await findOrCreateContactForSend(input.db, {
    email: input.email,
    clientId: input.clientId,
    companyName: input.businessName || undefined,
  });

  const { data: existing } = await input.db
    .from("contacts")
    .select("id, tags, name, company, source")
    .eq("id", contact.id)
    .maybeSingle();

  const tags = Array.from(
    new Set([
      ...((existing?.tags as string[] | null) ?? []),
      "cold_prospect",
      "prospect_audit",
      `trade:${input.trade}`,
    ]),
  );

  await input.db
    .from("contacts")
    .update({
      tags,
      company: existing?.company || input.businessName || null,
      source: existing?.source === "manual" ? existing.source : "prospect_audit",
      notes_preview: `Cold prospect audit · score ${input.score}/100 · ${input.url}`.slice(
        0,
        280,
      ),
      client_id: input.clientId,
    })
    .eq("id", contact.id);

  const weaknessHtml = input.summary.weaknesses
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");

  const html = `
<p>${escapeHtml(input.summary.opener)}</p>
<p>${escapeHtml(input.summary.summary)}</p>
<p><strong>Quick score:</strong> ${input.score}/100 for ${escapeHtml(input.url)}</p>
<p><strong>Weak spots worth fixing:</strong></p>
<ul>${weaknessHtml}</ul>
<p>If helpful, DigiSol can tighten the site and local marketing so nearby customers find you and convert. Reply to this email and we will follow up.</p>
<p style="color:#71717a;font-size:12px;">You are receiving this because your business contact address is published on your website and this note relates to your online presence. DigiSol · Alberta, Canada.</p>
`.trim();

  const sent = await sendEmailToContact({
    contactId: contact.id,
    contact: {
      id: contact.id,
      email: contact.email,
      name: contact.name,
      company: contact.company || input.businessName,
      unsubscribed_at: contact.unsubscribed_at,
    },
    db: input.db,
    clientId: input.clientId,
    companyName: DIGISOL_HOUSE_NAME,
    brand: DIGISOL_BRAND,
    subject: input.summary.subject,
    html,
  });

  return {
    contactId: contact.id,
    sendId: sent.sendId as string | undefined,
    resendId: sent.resendId as string | undefined,
  };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
