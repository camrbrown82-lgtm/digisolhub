import { NextResponse } from "next/server";
import { requireHubSession } from "@/lib/auth";
import { normalizeCampaignChannel } from "@/lib/campaignChannels";
import { normalizeContactAbVariant } from "@/lib/contactAbVariants";
import {
  ensureCampaignChannelSchema,
  isMissingContactChannelColumnError,
} from "@/lib/ensureCampaignChannelSchema";
import { emitHubEvent } from "@/lib/events";

type Params = { params: { id: string } };

const PATCH_KEYS = [
  "name",
  "email",
  "company",
  "domain",
  "phone",
  "service",
  "source",
  "tags",
  "client_id",
  "campaign_channel",
  "ab_variant",
  "unsubscribed_at",
] as const;

export async function GET(_request: Request, { params }: Params) {
  const { supabase, error } = await requireHubSession();
  if (error) return error;

  const { data, error: queryError } = await supabase
    .from("contacts")
    .select("*, notes(*)")
    .eq("id", params.id)
    .single();

  if (queryError) {
    return NextResponse.json({ error: queryError.message }, { status: 404 });
  }
  return NextResponse.json({ contact: data });
}

export async function PATCH(request: Request, { params }: Params) {
  const { supabase, error } = await requireHubSession();
  if (error) return error;

  const ensured = await ensureCampaignChannelSchema().catch((err: unknown) => ({
    ok: false as const,
    error: err instanceof Error ? err.message : "Schema ensure failed",
  }));
  if (!ensured.ok) {
    console.error("[contacts PATCH] schema ensure", ensured.error);
  }

  const body = (await request.json()) as Record<string, unknown>;
  const previous = await supabase
    .from("contacts")
    .select("tags")
    .eq("id", params.id)
    .single();

  const payload: Record<string, unknown> = {};
  for (const key of PATCH_KEYS) {
    if (!(key in body)) continue;
    payload[key] = body[key];
  }

  if ("campaign_channel" in payload) {
    payload.campaign_channel = normalizeCampaignChannel(
      typeof payload.campaign_channel === "string" ? payload.campaign_channel : null,
    );
  }
  if ("ab_variant" in payload) {
    payload.ab_variant = normalizeContactAbVariant(
      typeof payload.ab_variant === "string" ? payload.ab_variant : null,
    );
  }
  if ("client_id" in payload && payload.client_id === "") {
    payload.client_id = null;
  }

  let updateError = (
    await supabase.from("contacts").update(payload).eq("id", params.id)
  ).error;

  if (updateError && isMissingContactChannelColumnError(updateError.message)) {
    await ensureCampaignChannelSchema({ force: true }).catch(() => null);
    // Brief pause so PostgREST can pick up NOTIFY reload.
    await new Promise((resolve) => setTimeout(resolve, 400));
    updateError = (
      await supabase.from("contacts").update(payload).eq("id", params.id)
    ).error;
  }

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  const nextTags = Array.isArray(body.tags) ? (body.tags as string[]) : [];
  const prevTags = previous.data?.tags ?? [];
  const added = nextTags.find((tag) => !prevTags.includes(tag));
  if (added) {
    await emitHubEvent("hub/tag.added", { contactId: params.id, tag: added });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { supabase, error } = await requireHubSession();
  if (error) return error;

  const { error: deleteError } = await supabase
    .from("contacts")
    .delete()
    .eq("id", params.id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
