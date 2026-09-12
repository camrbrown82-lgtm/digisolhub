import { NextResponse } from "next/server";
import { requireHubSession } from "@/lib/auth";
import {
  findOrCreateContactForSend,
  getResendFrom,
  parseFromAddress,
  parseRecipientList,
  sendEmailToContact,
} from "@/lib/email";
import { brandFromClient } from "@/lib/branding";
import { getEmailLogoUrl } from "@/lib/emailLogo";
import { getActiveClient, getActiveClientId } from "@/lib/workspace";

type SendBody = {
  templateId?: string;
  contactId?: string;
  to?: string;
  segment?: "all" | "tag" | "service";
  tag?: string;
  service?: string;
  subject?: string;
  html?: string;
  campaignName?: string;
};

export async function POST(request: Request) {
  const { supabase, error } = await requireHubSession();
  if (error) return error;

  let body: SendBody;
  try {
    body = (await request.json()) as SendBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    return await sendCampaign(supabase, body);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Send failed" },
      { status: 400 },
    );
  }
}

async function sendCampaign(
  supabase: Awaited<ReturnType<typeof requireHubSession>>["supabase"],
  body: SendBody,
) {
  if (!body.templateId && !body.html) {
    return NextResponse.json({ error: "Template or HTML is required" }, { status: 400 });
  }

  const clientId = await getActiveClientId();
  const active = await getActiveClient(supabase);
  const { companyName, brand } = brandFromClient(active);
  const logoSrc = await getEmailLogoUrl(supabase, clientId || null);
  const contacts: Array<{
    id: string;
    email: string;
    name?: string | null;
    company?: string | null;
    unsubscribed_at?: string | null;
  }> = [];

  if (body.to?.trim()) {
    const emails = parseRecipientList(body.to);
    if (emails.length === 0) {
      return NextResponse.json({ error: "Add at least one valid email" }, { status: 400 });
    }
    for (const email of emails) {
      const contact = await findOrCreateContactForSend(supabase, {
        email,
        clientId: clientId || null,
        companyName,
      });
      if (contact.unsubscribed_at) continue;
      contacts.push(contact);
    }
  } else if (body.contactId) {
    let query = supabase
      .from("contacts")
      .select("id, email, name, company, unsubscribed_at")
      .eq("id", body.contactId);
    if (clientId) query = query.eq("client_id", clientId);
    const { data: scoped } = await query.maybeSingle();
    if (!scoped) {
      return NextResponse.json(
        { error: "That contact is not in the selected company" },
        { status: 400 },
      );
    }
    contacts.push(scoped);
  } else {
    let query = supabase
      .from("contacts")
      .select("id, email, name, company, unsubscribed_at")
      .is("unsubscribed_at", null);
    if (clientId) query = query.eq("client_id", clientId);

    if (body.segment === "tag" && body.tag) {
      query = query.contains("tags", [body.tag]);
    }
    if (body.segment === "service" && body.service) {
      query = query.eq("service", body.service);
    }

    const { data, error: queryError } = await query;
    if (queryError) {
      return NextResponse.json({ error: queryError.message }, { status: 400 });
    }
    contacts.push(...(data ?? []));
  }

  if (contacts.length === 0) {
    return NextResponse.json({ error: "No matching contacts" }, { status: 400 });
  }

  if (body.templateId && (body.subject || body.html)) {
    await supabase
      .from("email_templates")
      .update({
        ...(body.subject ? { subject: body.subject } : {}),
        ...(body.html ? { html: body.html } : {}),
      })
      .eq("id", body.templateId);
  }

  const { data: campaign } = await supabase
    .from("campaigns")
    .insert({
      name: body.campaignName || "One-off send",
      template_id: body.templateId ?? null,
      segment: {
        mode: body.to?.trim()
          ? "recipients"
          : body.contactId
            ? "single"
            : body.segment ?? "all",
        to: body.to,
        tag: body.tag,
        service: body.service,
      },
      status: "sending",
      client_id: clientId || null,
    })
    .select("id")
    .single();

  const results: { contactId: string; ok: boolean; error?: string }[] = [];
  for (const contact of contacts) {
    try {
      await sendEmailToContact({
        contactId: contact.id,
        contact,
        db: supabase,
        templateId: body.templateId,
        subject: body.subject,
        html: body.html,
        campaignId: campaign?.id,
        companyName,
        logoSrc,
        clientId: clientId || null,
        brand,
      });
      results.push({ contactId: contact.id, ok: true });
    } catch (err) {
      results.push({
        contactId: contact.id,
        ok: false,
        error: err instanceof Error ? err.message : "Send failed",
      });
    }
  }

  if (campaign?.id) {
    await supabase
      .from("campaigns")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
      })
      .eq("id", campaign.id);
  }

  const failed = results.filter((item) => !item.ok);
  const from = parseFromAddress(getResendFrom());
  return NextResponse.json({
    campaignId: campaign?.id,
    sent: results.filter((item) => item.ok).length,
    failed: failed.length,
    error: failed[0]?.error,
    from: from.email,
    results,
  });
}
