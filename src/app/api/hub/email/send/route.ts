import { NextResponse } from "next/server";
import { requireHubSession } from "@/lib/auth";
import {
  findOrCreateContactForSend,
  parseRecipientList,
  sendEmailToContact,
} from "@/lib/email";
import { getEmailLogoUrl } from "@/lib/emailLogo";
import { getActiveClient, getActiveClientId } from "@/lib/workspace";

export async function POST(request: Request) {
  const { supabase, error } = await requireHubSession();
  if (error) return error;

  const body = (await request.json()) as {
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

  if (!body.templateId && !body.html) {
    return NextResponse.json({ error: "Template or HTML is required" }, { status: 400 });
  }

  const clientId = await getActiveClientId();
  const active = await getActiveClient(supabase);
  const companyName = active?.name || "DigiSol";
  const logoSrc = await getEmailLogoUrl(supabase, clientId || null);

  let contactIds: string[] = [];

  if (body.to?.trim()) {
    const emails = parseRecipientList(body.to);
    if (emails.length === 0) {
      return NextResponse.json({ error: "Add at least one valid email" }, { status: 400 });
    }
    for (const email of emails) {
      const contact = await findOrCreateContactForSend({
        email,
        clientId: clientId || null,
        companyName,
      });
      if (contact.unsubscribed_at) continue;
      contactIds.push(contact.id);
    }
  } else if (body.contactId) {
    if (clientId) {
      const { data: scoped } = await supabase
        .from("contacts")
        .select("id")
        .eq("id", body.contactId)
        .eq("client_id", clientId)
        .maybeSingle();
      if (!scoped) {
        return NextResponse.json(
          { error: "That contact is not in the selected company" },
          { status: 400 },
        );
      }
    }
    contactIds = [body.contactId];
  } else {
    let query = supabase
      .from("contacts")
      .select("id")
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
    contactIds = (data ?? []).map((row) => row.id);
  }

  if (contactIds.length === 0) {
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
  for (const contactId of contactIds) {
    try {
      await sendEmailToContact({
        contactId,
        templateId: body.templateId,
        subject: body.subject,
        html: body.html,
        campaignId: campaign?.id,
        companyName,
        logoSrc,
      });
      results.push({ contactId, ok: true });
    } catch (err) {
      results.push({
        contactId,
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

  return NextResponse.json({
    campaignId: campaign?.id,
    sent: results.filter((item) => item.ok).length,
    failed: results.filter((item) => !item.ok).length,
    results,
  });
}
