import type { SupabaseClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { awardHelpEmailContent, awardLiveEmailContent } from "@/lib/awardEmail";
import type { AwardRow } from "@/lib/awardRegistry";
import { DIGISOL_BRAND, DIGISOL_HOUSE_NAME } from "@/lib/branding";
import {
  findOrCreateContactForSend,
  getResendApiKey,
  getResendFrom,
  sendEmailToContact,
} from "@/lib/email";
import { ensureWebsiteAwardsSchema } from "@/lib/ensureWebsiteAwardsSchema";
import { leadAlertRecipients } from "@/lib/leadAlert";
import { DIGISOL_SITE_URL } from "@/lib/site";
import { getOutboundSiteUrl } from "@/lib/supabase/env";
import { awardEmbedHtml, awardLinks, loadAward } from "@/lib/websiteAward";
import { ensureDigisolClient } from "@/lib/workspace";

const HOUR = 60 * 60 * 1000;
/** Give them time to add it on their own before offering help. */
const HELP_DELAY_MS = 3 * HOUR;
/** Mail security scanners open every link seconds after delivery; that isn't a person. */
const SCANNER_WINDOW_MS = 2 * 60 * 1000;
const LOOKBACK_MS = 14 * 24 * HOUR;

const COLUMNS =
  "id, company_name, target_url, audit_score, client_id, contact_id, site_host, sent_to, sent_at, add_page_viewed_at, claimed_at, claimed_from, featured, help_emailed_at, live_emailed_at";

type Row = Pick<
  AwardRow,
  | "id"
  | "company_name"
  | "target_url"
  | "audit_score"
  | "client_id"
  | "contact_id"
  | "site_host"
  | "sent_to"
  | "sent_at"
  | "add_page_viewed_at"
  | "claimed_at"
  | "claimed_from"
  | "featured"
  | "help_emailed_at"
  | "live_emailed_at"
>;

/** Marks the step as done before sending so overlapping runs can't double-send. */
async function claimStep(db: SupabaseClient, id: string, column: "help_emailed_at" | "live_emailed_at") {
  const { data } = await db
    .from("website_awards")
    .update({ [column]: new Date().toISOString(), featured: true })
    .eq("id", id)
    .is(column, null)
    .select("id");
  return Boolean(data?.length);
}

async function releaseStep(db: SupabaseClient, id: string, column: "help_emailed_at" | "live_emailed_at") {
  await db.from("website_awards").update({ [column]: null }).eq("id", id);
}

async function sendToWinner(db: SupabaseClient, row: Row, subject: string, html: string) {
  const contact = row.contact_id
    ? await db
        .from("contacts")
        .select("id, email, name, company, unsubscribed_at")
        .eq("id", row.contact_id)
        .maybeSingle()
        .then((r) => r.data)
    : null;
  const recipient =
    contact ??
    (await findOrCreateContactForSend(db, {
      email: row.sent_to!,
      clientId: row.client_id,
      companyName: row.company_name,
    }));
  if (recipient.unsubscribed_at) return "unsubscribed";
  const houseId = await ensureDigisolClient(db);
  await sendEmailToContact({
    contactId: recipient.id,
    contact: recipient,
    subject,
    html,
    db,
    clientId: houseId || null,
    companyName: DIGISOL_HOUSE_NAME,
    brand: DIGISOL_BRAND,
  });
  return "sent";
}

function esc(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

async function alertOwnerBadgeLive(row: Row, host: string, verifyUrl: string, emailed: string) {
  const apiKey = getResendApiKey();
  if (!apiKey) return;
  const caption = `Congratulations to ${row.company_name} on earning the DigiSol Excellence Award! Their website scored ${row.audit_score}/100 on our audit for speed, security and SEO, and the badge is now live on ${host}. See the verified score: ${verifyUrl}`;
  const facebook = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(verifyUrl)}`;
  const button = (href: string, label: string, primary: boolean) =>
    `<a href="${esc(href)}" style="display:inline-block;margin:0 8px 8px 0;padding:12px 18px;border-radius:999px;font-weight:600;text-decoration:none;${
      primary ? "background:#4f46e5;color:#ffffff;" : "background:#eef2ff;color:#3730a3;"
    }">${esc(label)}</a>`;
  const html = `
<div style="font-family:Inter,Arial,Helvetica,sans-serif;color:#18181b;max-width:560px;">
  <p style="margin:0 0 4px;font-size:13px;color:#4f46e5;font-weight:600;">Award badge live</p>
  <h1 style="margin:0 0 12px;font-size:22px;">${esc(row.company_name)} put the badge on ${esc(host)}</h1>
  <p style="margin:0 0 16px;">${esc(emailed)} They're featured on the winners page.</p>
  <p style="margin:0 0 6px;color:#71717a;font-size:13px;">Facebook post (copy this, then tap Share on Facebook and paste it)</p>
  <p style="margin:0 0 16px;padding:12px;border:1px solid #e4e4e7;border-radius:8px;white-space:pre-wrap;">${esc(caption)}</p>
  <div>
    ${button(facebook, "Share on Facebook", true)}
    ${button(`https://${host}`, "See it on their site", false)}
    ${button(`${DIGISOL_SITE_URL}/hub/awards`, "Open awards in Hub", false)}
  </div>
</div>`.trim();
  await new Resend(apiKey).emails
    .send({
      from: getResendFrom(),
      to: leadAlertRecipients(),
      subject: `Award badge live: ${row.company_name} (${host})`,
      html,
      text: `${row.company_name} put the award badge on ${host}. ${emailed}\n\nFacebook post:\n${caption}\n\nShare: ${facebook}`,
    })
    .catch(() => null);
}

/**
 * Award follow-ups: a helping hand a few hours after they open the add page, and a thank-you (plus an
 * owner alert with a ready Facebook post) once the badge shows up on their site. Both feature them.
 */
export async function runAwardFollowups(db: SupabaseClient) {
  const schema = await ensureWebsiteAwardsSchema();
  if (!schema.ok) return { skipped: schema.error };
  const now = Date.now();
  const since = new Date(now - LOOKBACK_MS).toISOString();
  const base = getOutboundSiteUrl();
  const winnersUrl = `${base}/awards`;
  const result = { helped: 0, live: 0, skipped: [] as string[] };

  const { data: helpRows } = await db
    .from("website_awards")
    .select(COLUMNS)
    .not("add_page_viewed_at", "is", null)
    .not("sent_to", "is", null)
    .is("claimed_at", null)
    .is("help_emailed_at", null)
    .gte("add_page_viewed_at", since)
    .lte("add_page_viewed_at", new Date(now - HELP_DELAY_MS).toISOString());

  for (const row of (helpRows ?? []) as Row[]) {
    const viewed = Date.parse(row.add_page_viewed_at!);
    if (row.sent_at && viewed - Date.parse(row.sent_at) < SCANNER_WINDOW_MS) continue;
    const award = await loadAward(db, row.id);
    if (award.state !== "valid") continue;
    if (!(await claimStep(db, row.id, "help_emailed_at"))) continue;
    try {
      const { subject, html } = awardHelpEmailContent({
        companyName: award.companyName,
        score: award.score,
        addBadgeUrl: awardLinks(base, row.id).add,
        winnersUrl,
        embedHtml: awardEmbedHtml(base, row.id, award.companyName, award.score),
      });
      const outcome = await sendToWinner(db, row, subject, html);
      if (outcome === "sent") result.helped += 1;
      else result.skipped.push(`${row.company_name}: ${outcome}`);
    } catch (error) {
      await releaseStep(db, row.id, "help_emailed_at");
      result.skipped.push(`${row.company_name}: ${error instanceof Error ? error.message : "send failed"}`);
    }
  }

  const { data: liveRows } = await db
    .from("website_awards")
    .select(COLUMNS)
    .not("claimed_at", "is", null)
    .is("live_emailed_at", null)
    .gte("claimed_at", since);

  for (const row of (liveRows ?? []) as Row[]) {
    const award = await loadAward(db, row.id);
    if (award.state !== "valid") continue;
    if (!(await claimStep(db, row.id, "live_emailed_at"))) continue;
    const host = row.claimed_from || row.site_host || "";
    const verifyUrl = awardLinks(base, row.id).verify;
    let emailed = "No award email address on file, so no thank-you was sent.";
    if (row.sent_to) {
      try {
        const { subject, html } = awardLiveEmailContent({
          companyName: award.companyName,
          score: award.score,
          host,
          verifyUrl,
          winnersUrl,
        });
        const outcome = await sendToWinner(db, row, subject, html);
        emailed =
          outcome === "sent"
            ? `A thank-you with share buttons went to ${row.sent_to}.`
            : `${row.sent_to} has unsubscribed, so no thank-you was sent.`;
      } catch (error) {
        await releaseStep(db, row.id, "live_emailed_at");
        result.skipped.push(`${row.company_name}: ${error instanceof Error ? error.message : "send failed"}`);
        continue;
      }
    }
    await alertOwnerBadgeLive(row, host, verifyUrl, emailed);
    result.live += 1;
  }

  return result;
}
