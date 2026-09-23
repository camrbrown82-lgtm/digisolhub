import { NextResponse } from "next/server";
import { requireHubSession } from "@/lib/auth";
import { normalizeCampaignChannel } from "@/lib/campaignChannels";
import { normalizeContactAbVariant } from "@/lib/contactAbVariants";
import { ensureCampaignChannelSchema } from "@/lib/ensureCampaignChannelSchema";
import { emitHubEvent } from "@/lib/events";
import { findOrCreateClient, resolveClientId } from "@/lib/workspace";

export async function GET() {
  const { supabase, error } = await requireHubSession();
  if (error) return error;

  const clientId = await resolveClientId(supabase);
  if (!clientId) {
    return NextResponse.json(
      { error: "No workspace selected" },
      { status: 400 },
    );
  }

  const { data, error: queryError } = await supabase
    .from("contacts")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  if (queryError) {
    return NextResponse.json({ error: queryError.message }, { status: 400 });
  }
  return NextResponse.json({ contacts: data });
}

export async function POST(request: Request) {
  const { user, supabase, error } = await requireHubSession();
  if (error || !user) return error;

  await ensureCampaignChannelSchema().catch(() => null);

  const body = (await request.json()) as {
    name?: string;
    email?: string;
    company?: string;
    domain?: string;
    phone?: string;
    service?: string;
    source?: string;
    tags?: string[];
    client_id?: string;
    campaign_channel?: string | null;
    ab_variant?: string | null;
  };

  const email = body.email?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const clientId =
    body.client_id ||
    (await resolveClientId(supabase)) ||
    (await findOrCreateClient(supabase, {
      name: body.company,
      domain: body.domain,
    }));

  const { data, error: insertError } = await supabase
    .from("contacts")
    .insert({
      name: body.name ?? null,
      email,
      company: body.company ?? null,
      domain: body.domain ?? null,
      phone: body.phone ?? null,
      service: body.service ?? null,
      source: body.source ?? "manual",
      tags: body.tags ?? [],
      client_id: clientId || null,
      campaign_channel: normalizeCampaignChannel(body.campaign_channel),
      ab_variant: normalizeContactAbVariant(body.ab_variant),
    })
    .select("id")
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 400 });
  }

  await emitHubEvent("hub/lead.created", { contactId: data.id });
  return NextResponse.json({ id: data.id });
}
