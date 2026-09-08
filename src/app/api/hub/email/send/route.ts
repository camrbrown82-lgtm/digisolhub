import { NextResponse } from "next/server";
import { requireHubSession } from "@/lib/auth";
import { sendEmailToContact } from "@/lib/email";

export async function POST(request: Request) {
  const { supabase, error } = await requireHubSession();
  if (error) return error;

  const body = (await request.json()) as {
    templateId?: string;
    contactId?: string;
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

  let contactIds: string[] = [];

  if (body.contactId) {
    contactIds = [body.contactId];
  } else {
    let query = supabase
      .from("contacts")
      .select("id")
      .is("unsubscribed_at", null);

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

  const { data: campaign } = await supabase
    .from("campaigns")
    .insert({
      name: body.campaignName || "One-off send",
      template_id: body.templateId ?? null,
      segment: {
        mode: body.contactId ? "single" : body.segment ?? "all",
        tag: body.tag,
        service: body.service,
      },
      status: "sending",
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
