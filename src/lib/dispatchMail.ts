import type { SupabaseClient } from "@supabase/supabase-js";
import { brandFromClient } from "@/lib/branding";
import {
  type DispatchIssue,
  dispatchUrl,
  publishedDispatchIssues,
} from "@/lib/dispatch";
import { getEmailLogoUrl } from "@/lib/emailLogo";
import { sendEmailToContact } from "@/lib/email";
import { DIGISOL_SITE_URL } from "@/lib/site";
import { ensureDigisolClient, getDigisolClient } from "@/lib/workspace";

export const DISPATCH_TAG = "dispatch";

type DispatchContact = {
  id: string;
  email: string;
  name?: string | null;
  company?: string | null;
  created_at?: string;
  unsubscribed_at?: string | null;
};

function firstName(name?: string | null) {
  const part = name?.trim().split(/\s+/)[0];
  return part || "there";
}

function campaignNameFor(issue: DispatchIssue) {
  return `DigiSol Dispatch · ${issue.month} ${issue.year}`;
}

export function dispatchIssueEmailBody(issue: DispatchIssue, name?: string | null) {
  const url = dispatchUrl(issue.slug);
  return `Hey ${firstName(name)},

The ${issue.month} DigiSol Dispatch is out.

${issue.title}

${issue.excerpt}

Read the issue: ${url}

If you want this applied to your Alberta company, book a consult: ${DIGISOL_SITE_URL}/#contact

Cameron
DigiSol`;
}

export function dispatchWelcomeEmailBody(name?: string | null) {
  return `Hey ${firstName(name)},

You're on DigiSol Dispatch. Each month, when a new issue goes live, we'll email you the link.

No filler. Local SEO, website design, and the engineering that makes the traffic convert.

The archive is here: ${DIGISOL_SITE_URL}/dispatch

Cameron
DigiSol`;
}

async function claimSend(
  db: SupabaseClient,
  contactId: string,
  slug: string,
  campaignId: string | null,
) {
  const { data, error } = await db
    .from("dispatch_sends")
    .insert({
      contact_id: contactId,
      slug,
      status: "queued",
      campaign_id: campaignId,
    })
    .select("id")
    .maybeSingle();
  if (error?.code === "23505") return null;
  if (error || !data) return null;
  return data.id as string;
}

async function ensureCampaign(db: SupabaseClient, issue: DispatchIssue, clientId: string | null) {
  const name = campaignNameFor(issue);
  const { data: existing } = await db
    .from("campaigns")
    .select("id")
    .eq("name", name)
    .maybeSingle();
  if (existing?.id) return existing.id as string;

  const { data: created } = await db
    .from("campaigns")
    .insert({
      name,
      status: "sending",
      segment: { kind: "dispatch", slug: issue.slug },
      client_id: clientId,
    })
    .select("id")
    .single();
  return (created?.id as string | undefined) ?? null;
}

export async function sendDispatchIssueToContact(
  db: SupabaseClient,
  issue: DispatchIssue,
  contact: DispatchContact,
  opts: {
    campaignId: string | null;
    clientId: string | null;
    logoSrc: string;
    companyName: string;
    brand: ReturnType<typeof brandFromClient>["brand"];
  },
) {
  const claimId = await claimSend(db, contact.id, issue.slug, opts.campaignId);
  if (!claimId) return { skipped: true as const };

  try {
    await sendEmailToContact({
      db,
      contactId: contact.id,
      contact,
      campaignId: opts.campaignId,
      clientId: opts.clientId,
      companyName: opts.companyName,
      logoSrc: opts.logoSrc,
      brand: opts.brand,
      subject: `${issue.month} Dispatch: ${issue.title}`,
      html: dispatchIssueEmailBody(issue, contact.name),
    });
    await db.from("dispatch_sends").update({ status: "sent" }).eq("id", claimId);
    return { sent: true as const };
  } catch (error) {
    await db.from("dispatch_sends").delete().eq("id", claimId);
    throw error;
  }
}

function subscribedBeforeIssue(contact: DispatchContact, issue: DispatchIssue) {
  const joined = (contact.created_at || "").slice(0, 10);
  if (!joined) return true;
  return issue.publishedAt > joined;
}

export async function sendNewDispatchIssues(db: SupabaseClient) {
  const house = await getDigisolClient(db);
  const { companyName, brand } = brandFromClient(house);
  const logoSrc = await getEmailLogoUrl(db, house?.id);
  const issues = publishedDispatchIssues();

  const { data: subscribers, error } = await db
    .from("contacts")
    .select("id, email, name, company, created_at, unsubscribed_at")
    .contains("tags", [DISPATCH_TAG])
    .is("unsubscribed_at", null);

  if (error) throw new Error(error.message);

  const results = { issues: 0, sent: 0, skipped: 0, failed: 0 };

  for (const issue of issues) {
    const campaignId = await ensureCampaign(db, issue, house?.id || null);
    let issueSent = 0;
    for (const contact of subscribers ?? []) {
      if (!subscribedBeforeIssue(contact, issue)) {
        results.skipped += 1;
        continue;
      }
      try {
        const result = await sendDispatchIssueToContact(db, issue, contact, {
          campaignId,
          clientId: house?.id || null,
          logoSrc,
          companyName,
          brand,
        });
        if (result.skipped) results.skipped += 1;
        else {
          results.sent += 1;
          issueSent += 1;
        }
      } catch (error) {
        console.error("Dispatch send failed", issue.slug, contact.email, error);
        results.failed += 1;
      }
    }
    if (issueSent > 0 && campaignId) {
      await db
        .from("campaigns")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", campaignId);
      results.issues += 1;
    }
  }

  return results;
}

export async function subscribeToDispatch(
  db: SupabaseClient,
  input: {
    name: string;
    email: string;
    company?: string;
  },
) {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  const company = input.company?.trim() || null;
  const clientId = await ensureDigisolClient(db);

  const { data: existing } = await db
    .from("contacts")
    .select("id, tags, unsubscribed_at, name, company")
    .ilike("email", email)
    .maybeSingle();

  const tags = Array.from(
    new Set([...(existing?.tags ?? []), DISPATCH_TAG]),
  );

  let contactId = existing?.id as string | undefined;
  if (existing) {
    await db
      .from("contacts")
      .update({
        name: name || existing.name || null,
        company: company || existing.company || null,
        tags,
        unsubscribed_at: null,
      })
      .eq("id", existing.id);
  } else {
    const { data, error } = await db
      .from("contacts")
      .insert({
        name,
        email,
        company,
        source: "dispatch",
        tags,
        client_id: clientId || null,
      })
      .select("id")
      .single();
    if (error || !data) throw new Error(error?.message || "Could not subscribe");
    contactId = data.id;
  }

  if (!contactId) throw new Error("Could not subscribe");

  const house = await getDigisolClient(db);
  const { companyName, brand } = brandFromClient(house);
  const logoSrc = await getEmailLogoUrl(db, house?.id);

  try {
    await sendEmailToContact({
      db,
      contactId,
      contact: {
        id: contactId,
        email,
        name,
        company,
        unsubscribed_at: null,
      },
      clientId: house?.id || null,
      companyName,
      logoSrc,
      brand,
      subject: "You're on DigiSol Dispatch",
      html: dispatchWelcomeEmailBody(name),
    });
  } catch (error) {
    console.error("Dispatch welcome email failed", error);
  }

  return { id: contactId };
}
