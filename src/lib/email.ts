import { createAdminClient } from "@/lib/supabase/admin";
import { buildEmailHtml } from "@/lib/emailHtml";
import { defaultEmailLogoUrl } from "@/lib/emailLogo";
import { renderMergeFields } from "@/lib/emailTemplates";
import { unsubscribeUrl, wrapCampaignHtml } from "@/lib/unsubscribe";
import { Resend } from "resend";

export type SendEmailInput = {
  contactId: string;
  templateId?: string;
  subject?: string;
  html?: string;
  campaignId?: string | null;
  companyName?: string;
  logoSrc?: string;
};

export async function sendEmailToContact(input: SendEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!apiKey || !from) {
    throw new Error("RESEND_API_KEY or RESEND_FROM is not configured");
  }

  const admin = createAdminClient();
  const { data: contact, error: contactError } = await admin
    .from("contacts")
    .select("id, email, name, company, unsubscribed_at")
    .eq("id", input.contactId)
    .single();

  if (contactError || !contact) {
    throw new Error("Contact not found");
  }
  if (contact.unsubscribed_at) {
    throw new Error("Contact is unsubscribed");
  }

  let subject = input.subject ?? "";
  let html = input.html ?? "";

  if (input.templateId) {
    const { data: template, error: templateError } = await admin
      .from("email_templates")
      .select("id, subject, html")
      .eq("id", input.templateId)
      .single();
    if (templateError || !template) {
      throw new Error("Template not found");
    }
    subject = subject || template.subject || "Message from DigiSol";
    html = html || template.html || "";
  }

  if (!html) {
    throw new Error("Email HTML is empty");
  }

  const companyName = input.companyName?.trim() || contact.company || "DigiSol";
  const mergedSubject = renderMergeFields(subject, {
    name: contact.name || "there",
    company: companyName,
  });
  const mergedBody = renderMergeFields(html, {
    name: contact.name || "there",
    company: companyName,
  });
  const branded = buildEmailHtml(mergedBody, {
    logoSrc: input.logoSrc || defaultEmailLogoUrl(),
    companyName,
  });
  const personalized = wrapCampaignHtml(branded, contact.email);

  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from,
    to: contact.email,
    subject: mergedSubject || "Message from DigiSol",
    html: personalized,
    headers: {
      "List-Unsubscribe": `<${unsubscribeUrl(contact.email)}>`,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  const { data: sendRow, error: sendError } = await admin
    .from("sends")
    .insert({
      campaign_id: input.campaignId ?? null,
      contact_id: contact.id,
      template_id: input.templateId ?? null,
      resend_id: data?.id ?? null,
      status: "sent",
    })
    .select("id")
    .single();

  if (sendError) {
    console.error("Failed to record send", sendError);
  }

  return { resendId: data?.id, sendId: sendRow?.id };
}

export function parseRecipientList(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[,;\s]+/)
        .map((email) => email.trim().toLowerCase())
        .filter((email) => email.includes("@")),
    ),
  );
}

export async function findOrCreateContactForSend(input: {
  email: string;
  clientId?: string | null;
  companyName?: string;
}) {
  const admin = createAdminClient();
  const email = input.email.trim().toLowerCase();
  const { data: existing } = await admin
    .from("contacts")
    .select("id, unsubscribed_at")
    .ilike("email", email)
    .maybeSingle();
  if (existing) return existing;

  const { data: created, error } = await admin
    .from("contacts")
    .insert({
      email,
      company: input.companyName || null,
      source: "email-send",
      client_id: input.clientId || null,
    })
    .select("id, unsubscribed_at")
    .single();
  if (error || !created) {
    throw new Error(error?.message || "Could not add recipient");
  }
  return created;
}
