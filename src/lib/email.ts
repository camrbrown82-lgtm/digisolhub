import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildEmailHtml } from "@/lib/emailHtml";
import { defaultEmailLogoUrl } from "@/lib/emailLogo";
import { renderMergeFields } from "@/lib/emailTemplates";
import { unsubscribeUrl, wrapCampaignHtml } from "@/lib/unsubscribe";
import { Resend } from "resend";

function firstEnv(...names: string[]) {
  for (const name of names) {
    const value = process.env[name]?.trim().replace(/^["']|["']$/g, "");
    if (value) return value;
  }
  return "";
}

const TEST_FROM = "DigiSol <onboarding@resend.dev>";

export function getResendApiKey() {
  return firstEnv("RESEND_API_KEY");
}

export function getResendFrom() {
  return firstEnv("RESEND_FROM", "RESEND_FROM_EMAIL", "EMAIL_FROM") || TEST_FROM;
}

export function explainResendError(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("only send testing emails")) {
    return `${message} Verify wwwdigisol.com in Resend → Domains, then set RESEND_FROM to an address on that domain. Until then you can only send a test to the email on the Resend account.`;
  }
  if (lower.includes("not verified") || lower.includes("invalid `from`") || lower.includes("invalid from")) {
    return `${message} RESEND_FROM must use a domain you verified at resend.com/domains. Example: DigiSol <hello@wwwdigisol.com>.`;
  }
  if (lower.includes("api key") || lower.includes("unauthorized")) {
    return "Resend rejected RESEND_API_KEY. Check the value in Vercel and .env.local.";
  }
  return message;
}

export type SendEmailInput = {
  contactId: string;
  templateId?: string;
  subject?: string;
  html?: string;
  campaignId?: string | null;
  companyName?: string;
  logoSrc?: string;
  db?: SupabaseClient;
  contact?: {
    id: string;
    email: string;
    name?: string | null;
    company?: string | null;
    unsubscribed_at?: string | null;
  };
};

export async function sendEmailToContact(input: SendEmailInput) {
  const apiKey = getResendApiKey();
  const from = getResendFrom();
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  const db = input.db ?? createAdminClient();
  let contact = input.contact;
  if (!contact) {
    const { data, error: contactError } = await db
      .from("contacts")
      .select("id, email, name, company, unsubscribed_at")
      .eq("id", input.contactId)
      .single();
    if (contactError || !data) {
      throw new Error("Contact not found");
    }
    contact = data;
  }

  if (contact.unsubscribed_at) {
    throw new Error("Contact is unsubscribed");
  }

  let subject = input.subject ?? "";
  let html = input.html ?? "";

  if (input.templateId) {
    const { data: template, error: templateError } = await db
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
  const payload = {
    from,
    to: contact.email,
    subject: mergedSubject || "Message from DigiSol",
    html: personalized,
    headers: {
      "List-Unsubscribe": `<${unsubscribeUrl(contact.email)}>`,
    },
  };
  let { data, error } = await resend.emails.send(payload);
  if (
    error &&
    from !== TEST_FROM &&
    /not verified|invalid `from`|invalid from/i.test(error.message)
  ) {
    ({ data, error } = await resend.emails.send({ ...payload, from: TEST_FROM }));
  }

  if (error) {
    throw new Error(explainResendError(error.message));
  }

  const { data: sendRow, error: sendError } = await db
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

export async function findOrCreateContactForSend(
  db: SupabaseClient,
  input: {
    email: string;
    clientId?: string | null;
    companyName?: string;
  },
) {
  const email = input.email.trim().toLowerCase();
  const { data: existing } = await db
    .from("contacts")
    .select("id, email, name, company, unsubscribed_at")
    .ilike("email", email)
    .maybeSingle();
  if (existing) return existing;

  const { data: created, error } = await db
    .from("contacts")
    .insert({
      email,
      company: input.companyName || null,
      source: "email-send",
      client_id: input.clientId || null,
    })
    .select("id, email, name, company, unsubscribed_at")
    .single();
  if (created) return created;

  const { data: again } = await db
    .from("contacts")
    .select("id, email, name, company, unsubscribed_at")
    .ilike("email", email)
    .maybeSingle();
  if (again) return again;
  throw new Error(error?.message || "Could not add recipient");
}
