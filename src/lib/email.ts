import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { type CompanyBrand, DIGISOL_BRAND } from "@/lib/branding";
import { buildEmailHtml, htmlToText } from "@/lib/emailHtml";
import {
  EMAIL_LOGO_CID,
  publicEmailLogoUrl,
  resolveEmailLogoFile,
} from "@/lib/emailLogo";
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
const PERSONAL_INBOX_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "icloud.com",
  "me.com",
]);

export function getResendApiKey() {
  return firstEnv("RESEND_API_KEY");
}

export function parseFromAddress(value: string) {
  const raw = value.trim().replace(/^["']|["']$/g, "");
  const angled = raw.match(/<([^>]+)>/);
  const email = (angled?.[1] || raw.match(/[^\s<>]+@[^\s<>]+/)?.[0] || "").toLowerCase();
  const domain = email.split("@")[1] || "";
  const name = angled ? raw.replace(/<[^>]+>/, "").trim().replace(/^"|"$/g, "") : "";
  return { raw, email, domain, name, isTest: domain === "resend.dev" };
}

export function getResendFrom() {
  const configured = firstEnv("RESEND_FROM", "RESEND_FROM_EMAIL", "EMAIL_FROM");
  if (!configured) return TEST_FROM;
  const parsed = parseFromAddress(configured);
  if (!parsed.email) return configured;
  return parsed.name ? `${parsed.name} <${parsed.email}>` : parsed.email;
}

export function assertSendableFrom(from = getResendFrom()) {
  const parsed = parseFromAddress(from);
  if (PERSONAL_INBOX_DOMAINS.has(parsed.domain)) {
    throw new Error(
      `RESEND_FROM is ${parsed.email}. Resend cannot send From a personal inbox. Use an address on the verified domain, for example DigiSol <hello@wwwdigisol.com>, and put ${parsed.email} in RESEND_REPLY_TO if you want replies there.`,
    );
  }
}

export function explainResendError(message: string, from = getResendFrom()) {
  const parsed = parseFromAddress(from);
  const using = parsed.email ? ` Sending as ${parsed.email}.` : "";
  const lower = message.toLowerCase();
  if (parsed.isTest || lower.includes("only send testing emails")) {
    return `${message}${using} RESEND_FROM is still the Resend test sender. Set it to an address on your verified domain, for example DigiSol <hello@wwwdigisol.com>, then redeploy.`;
  }
  if (lower.includes("not verified") || lower.includes("invalid `from`") || lower.includes("invalid from")) {
    return `${message}${using} The From domain must match the domain that is green in the same Resend account as RESEND_API_KEY.`;
  }
  if (lower.includes("api key") || lower.includes("unauthorized")) {
    return "Resend rejected RESEND_API_KEY. Check the value in Vercel and .env.local.";
  }
  return `${message}${using}`;
}

export type SendEmailInput = {
  contactId: string;
  templateId?: string;
  subject?: string;
  html?: string;
  campaignId?: string | null;
  companyName?: string;
  logoSrc?: string;
  clientId?: string | null;
  brand?: CompanyBrand;
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
  assertSendableFrom(from);

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
  const brand = input.brand || DIGISOL_BRAND;
  const logo = await resolveEmailLogoFile(db, input.clientId);
  const logoSrc = logo
    ? `cid:${EMAIL_LOGO_CID}`
    : input.logoSrc && !input.logoSrc.includes("localhost")
      ? input.logoSrc
      : publicEmailLogoUrl();
  const branded = buildEmailHtml(mergedBody, {
    logoSrc,
    companyName,
    tagline: brand.tagline,
    primaryColor: brand.primaryColor,
    secondaryColor: brand.secondaryColor,
    backgroundColor: brand.backgroundColor,
    fonts: brand.fonts,
  });
  const personalized = wrapCampaignHtml(branded, contact.email);
  const unsub = unsubscribeUrl(contact.email);

  const resend = new Resend(apiKey);
  const payload = {
    from,
    to: contact.email,
    ...(firstEnv("RESEND_REPLY_TO") ? { replyTo: firstEnv("RESEND_REPLY_TO") } : {}),
    subject: mergedSubject || "Message from DigiSol",
    html: personalized,
    text: htmlToText(personalized),
    headers: {
      "List-Unsubscribe": `<${unsub}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
    attachments: logo
      ? [
          {
            filename: logo.filename,
            content: logo.buffer,
            contentType: logo.contentType,
            contentId: EMAIL_LOGO_CID,
          },
        ]
      : undefined,
  };
  const { data, error } = await resend.emails.send(payload);

  if (error) {
    throw new Error(explainResendError(error.message, from));
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
