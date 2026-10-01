import { Resend } from "resend";
import { getResendApiKey, getResendFrom } from "@/lib/email";
import { DIGISOL_EMAIL, DIGISOL_SITE_URL } from "@/lib/site";

export type LeadAlert = {
  /** Where it came from, e.g. "Website contact form". */
  sourceLabel: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  service?: string | null;
  /** Site that was audited or discussed, even when no person left contact details. */
  website?: string | null;
  message?: string | null;
  contactId?: string | null;
  /** Extra line under the heading, e.g. why this is worth a call. */
  note?: string | null;
};

/** LEAD_ALERT_EMAILS (comma-separated) adds or replaces who gets told about new leads. */
export function leadAlertRecipients() {
  const extra = (process.env.LEAD_ALERT_EMAILS ?? "")
    .split(/[,;\s]+/)
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.includes("@"));
  return extra.length ? Array.from(new Set(extra)) : [DIGISOL_EMAIL];
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function telHref(phone: string) {
  const digits = phone.replace(/[^\d+]/g, "");
  return digits ? `tel:${digits}` : "";
}

/** Owner alert for a new lead, with one-tap call / reply / open-in-Hub buttons. */
export async function sendLeadAlert(lead: LeadAlert) {
  const apiKey = getResendApiKey();
  if (!apiKey) return { ok: false, message: "Resend is not configured." };

  const name = lead.name?.trim() || "";
  const email = lead.email?.trim() || "";
  const phone = lead.phone?.trim() || "";
  const website = lead.website?.trim() || "";
  const who = name || email || phone || website || "Someone";
  const hubUrl = lead.contactId ? `${DIGISOL_SITE_URL}/hub/contacts/${lead.contactId}` : "";
  const tel = phone ? telHref(phone) : "";

  const rows: Array<[string, string]> = [
    ["Name", name || "-"],
    ["Phone", phone || "Not given"],
    ["Email", email || "Not given"],
    ["Business", lead.company?.trim() || "-"],
    ...(website ? ([["Website", website]] as Array<[string, string]>) : []),
    ["Service", lead.service?.trim() || "-"],
  ];

  const button = (href: string, label: string, primary: boolean) =>
    `<a href="${escapeHtml(href)}" style="display:inline-block;margin:0 8px 8px 0;padding:12px 18px;border-radius:999px;font-weight:600;text-decoration:none;${
      primary ? "background:#4f46e5;color:#ffffff;" : "background:#eef2ff;color:#3730a3;"
    }">${escapeHtml(label)}</a>`;

  const html = `
<div style="font-family:Inter,Arial,Helvetica,sans-serif;color:#18181b;max-width:560px;">
  <p style="margin:0 0 4px;font-size:13px;color:#4f46e5;font-weight:600;">New lead · ${escapeHtml(lead.sourceLabel)}</p>
  <h1 style="margin:0 0 12px;font-size:22px;">${escapeHtml(who)}</h1>
  ${lead.note ? `<p style="margin:0 0 12px;">${escapeHtml(lead.note)}</p>` : ""}
  <div style="margin:0 0 16px;">
    ${tel ? button(tel, `Call ${phone}`, true) : ""}
    ${email ? button(`mailto:${email}`, "Reply by email", !tel) : ""}
    ${website ? button(website.startsWith("http") ? website : `https://${website}`, "Open website", !tel && !email) : ""}
    ${hubUrl ? button(hubUrl, "Open in Hub", false) : ""}
  </div>
  <table style="border-collapse:collapse;font-size:14px;margin:0 0 16px;">
    ${rows
      .map(
        ([label, value]) =>
          `<tr><td style="padding:4px 16px 4px 0;color:#71717a;">${label}</td><td style="padding:4px 0;">${escapeHtml(value)}</td></tr>`,
      )
      .join("")}
  </table>
  ${
    lead.message?.trim()
      ? `<p style="margin:0 0 4px;color:#71717a;font-size:13px;">What they said</p><p style="margin:0 0 16px;white-space:pre-wrap;">${escapeHtml(lead.message.trim())}</p>`
      : ""
  }
  <p style="margin:0;color:#71717a;font-size:12px;">DigiSol Hub lead alert. Replying to this email replies to the lead.</p>
</div>`.trim();

  const text = [
    `New lead · ${lead.sourceLabel}`,
    who,
    lead.note || "",
    "",
    ...rows.map(([label, value]) => `${label}: ${value}`),
    "",
    lead.message?.trim() ? `What they said:\n${lead.message.trim()}\n` : "",
    hubUrl ? `Open in Hub: ${hubUrl}` : "",
  ]
    .filter((line, i, all) => line !== "" || all[i - 1] !== "")
    .join("\n");

  try {
    const { error } = await new Resend(apiKey).emails.send({
      from: getResendFrom(),
      to: leadAlertRecipients(),
      ...(email ? { replyTo: email } : {}),
      subject: `New lead: ${who}${phone ? ` · ${phone}` : ""} (${lead.sourceLabel})`,
      html,
      text,
    });
    if (error) return { ok: false, message: error.message };
    return { ok: true, message: "" };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Lead alert failed" };
  }
}
