import { createAdminClient } from "@/lib/supabase/admin";
import { unsubscribeUrl, wrapCampaignHtml } from "@/lib/unsubscribe";
import { Resend } from "resend";

export type SendEmailInput = {
  contactId: string;
  templateId?: string;
  subject?: string;
  html?: string;
  campaignId?: string | null;
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
    .select("id, email, name, unsubscribed_at")
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

  const personalized = wrapCampaignHtml(html, contact.email).replaceAll(
    "{{name}}",
    contact.name || "there",
  );

  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from,
    to: contact.email,
    subject: subject || "Message from DigiSol",
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
