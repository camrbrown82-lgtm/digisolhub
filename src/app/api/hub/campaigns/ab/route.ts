import { NextResponse } from "next/server";
import { requireHubSession } from "@/lib/auth";
import { logAbVariantEngagement } from "@/lib/abVariantTracking";
import { assignAbVariants } from "@/lib/campaignAb";
import { brandFromClient } from "@/lib/branding";
import { normalizeCampaignChannel } from "@/lib/campaignChannels";
import { normalizeContactAbVariant } from "@/lib/contactAbVariants";
import {
  findOrCreateContactForSend,
  getResendFrom,
  parseFromAddress,
  parseRecipientList,
  sendEmailToContact,
} from "@/lib/email";
import { getEmailLogoUrl } from "@/lib/emailLogo";
import { ensureCampaignAbSchema } from "@/lib/ensureCampaignAbSchema";
import { ensureCampaignChannelSchema } from "@/lib/ensureCampaignChannelSchema";
import { getWorkspaceClient } from "@/lib/workspace";

type AbBody = {
  name?: string;
  industry?: string;
  templateAId?: string;
  templateBId?: string;
  splitPercentA?: number;
  segment?: "all" | "tag" | "service";
  tag?: string;
  service?: string;
  campaignChannel?: string;
  abVariant?: string;
  to?: string;
};

export async function POST(request: Request) {
  const { supabase, error } = await requireHubSession();
  if (error) return error;

  const schema = await ensureCampaignAbSchema();
  if (!schema.ok) {
    return NextResponse.json({ error: schema.error }, { status: 503 });
  }
  await ensureCampaignChannelSchema().catch(() => null);

  let body: AbBody;
  try {
    body = (await request.json()) as AbBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.templateAId || !body.templateBId) {
    return NextResponse.json(
      { error: "Pick two email templates (variant A and B)." },
      { status: 400 },
    );
  }
  if (body.templateAId === body.templateBId) {
    return NextResponse.json(
      { error: "Variants A and B need different templates." },
      { status: 400 },
    );
  }

  const active = await getWorkspaceClient(supabase);
  const clientId = active?.id || "";
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
    for (const email of parseRecipientList(body.to)) {
      const contact = await findOrCreateContactForSend(supabase, {
        email,
        clientId: clientId || null,
        companyName,
      });
      if (!contact.unsubscribed_at) contacts.push(contact);
    }
  } else {
    let query = supabase
      .from("contacts")
      .select("id, email, name, company, unsubscribed_at")
      .is("unsubscribed_at", null);
    if (clientId) query = query.eq("client_id", clientId);
    if (body.segment === "tag" && body.tag) {
      query = query.contains("tags", [body.tag]);
    }
    if (
      (body.segment === "service" || body.industry) &&
      (body.service || body.industry)
    ) {
      query = query.eq("service", body.service || body.industry || "");
    }
    const channel = normalizeCampaignChannel(body.campaignChannel);
    if (channel) query = query.eq("campaign_channel", channel);
    const ab = normalizeContactAbVariant(body.abVariant);
    if (ab) query = query.eq("ab_variant", ab);
    const { data, error: queryError } = await query;
    if (queryError) {
      return NextResponse.json({ error: queryError.message }, { status: 400 });
    }
    contacts.push(...(data ?? []));
  }

  if (contacts.length < 2) {
    return NextResponse.json(
      {
        error:
          "Need at least 2 subscribed contacts in this audience to run a meaningful A/B split.",
      },
      { status: 400 },
    );
  }

  const split = body.splitPercentA ?? 50;
  const assignment = assignAbVariants(contacts, split);

  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .insert({
      name: body.name?.trim() || `A/B · ${body.industry || "campaign"}`,
      template_id: body.templateAId,
      template_b_id: body.templateBId,
      is_ab: true,
      industry: body.industry?.trim() || body.service?.trim() || null,
      ab_split: Math.min(90, Math.max(10, Math.round(split))),
      segment: {
        mode: body.to?.trim()
          ? "recipients"
          : body.segment ?? (body.industry ? "service" : "all"),
        to: body.to,
        tag: body.tag,
        service: body.service || body.industry,
        campaignChannel: body.campaignChannel || null,
        abVariant: body.abVariant || null,
        ab: true,
      },
      status: "sending",
      client_id: clientId || null,
    })
    .select("id, name")
    .single();

  if (campaignError || !campaign) {
    return NextResponse.json(
      {
        error:
          campaignError?.message ||
          "Could not create A/B campaign. Run the campaign_ab migration if columns are missing.",
      },
      { status: 400 },
    );
  }

  const results: {
    contactId: string;
    variant: string;
    ok: boolean;
    error?: string;
  }[] = [];

  for (const contact of contacts) {
    const variant = assignment.get(contact.id) || "A";
    const templateId =
      variant === "B" ? body.templateBId : body.templateAId;
    try {
      const sent = await sendEmailToContact({
        contactId: contact.id,
        contact,
        db: supabase,
        templateId,
        campaignId: campaign.id,
        variant,
        companyName,
        logoSrc,
        clientId: clientId || null,
        brand,
      });
      results.push({ contactId: contact.id, variant, ok: true });
      await logAbVariantEngagement(supabase, {
        sendId: sent.sendId || sent.resendId || contact.id,
        contactId: contact.id,
        campaignId: campaign.id,
        variant,
        event: "sent",
      }).catch(() => null);
    } catch (err) {
      results.push({
        contactId: contact.id,
        variant,
        ok: false,
        error: err instanceof Error ? err.message : "Send failed",
      });
    }
  }

  await supabase
    .from("campaigns")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
    })
    .eq("id", campaign.id);

  const failed = results.filter((item) => !item.ok);
  const from = parseFromAddress(getResendFrom());
  return NextResponse.json({
    campaignId: campaign.id,
    name: campaign.name,
    sent: results.filter((item) => item.ok).length,
    sentA: results.filter((item) => item.ok && item.variant === "A").length,
    sentB: results.filter((item) => item.ok && item.variant === "B").length,
    failed: failed.length,
    error: failed[0]?.error,
    from: from.email,
  });
}
