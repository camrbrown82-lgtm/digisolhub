import { NextResponse } from "next/server";
import { requireHubSession } from "@/lib/auth";
import { normalizeCampaignChannel } from "@/lib/campaignChannels";
import { normalizeContactAbVariant } from "@/lib/contactAbVariants";
import {
  ensureCampaignChannelSchema,
  isMissingContactChannelColumnError,
} from "@/lib/ensureCampaignChannelSchema";
import { emitHubEvent } from "@/lib/events";
import {
  assertContactInWorkspace,
  requireWorkspaceClientId,
} from "@/lib/tenantGuard";

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
  "campaign_channel",
  "ab_variant",
  "unsubscribed_at",
] as const;

export async function GET(_request: Request, { params }: Params) {
  const { supabase, error } = await requireHubSession();
  if (error) return error;

  const workspace = await requireWorkspaceClientId(supabase);
  if (workspace.error) return workspace.error;

  const { data, error: queryError } = await supabase
    .from("contacts")
    .select("*, notes(*)")
    .eq("id", params.id)
    .eq("client_id", workspace.clientId)
    .maybeSingle();

  if (queryError || !data) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }
  return NextResponse.json({ contact: data });
}

export async function PATCH(request: Request, { params }: Params) {
  const { supabase, error } = await requireHubSession();
  if (error) return error;

  const workspace = await requireWorkspaceClientId(supabase);
  if (workspace.error) return workspace.error;

  const allowed = await assertContactInWorkspace(
    supabase,
    params.id,
    workspace.clientId,
  );
  if (!allowed) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

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
    .eq("client_id", workspace.clientId)
    .maybeSingle();

  const payload: Record<string, unknown> = {};
  for (const key of PATCH_KEYS) {
    if (!(key in body)) continue;
    payload[key] = body[key];
  }

  // Never allow reassignment across tenants from the client.
  delete payload.client_id;

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

  let updateError = (
    await supabase
      .from("contacts")
      .update(payload)
      .eq("id", params.id)
      .eq("client_id", workspace.clientId)
  ).error;

  if (updateError && isMissingContactChannelColumnError(updateError.message)) {
    await ensureCampaignChannelSchema({ force: true }).catch(() => null);
    await new Promise((resolve) => setTimeout(resolve, 400));
    updateError = (
      await supabase
        .from("contacts")
        .update(payload)
        .eq("id", params.id)
        .eq("client_id", workspace.clientId)
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

  const workspace = await requireWorkspaceClientId(supabase);
  if (workspace.error) return workspace.error;

  const { error: deleteError, count } = await supabase
    .from("contacts")
    .delete({ count: "exact" })
    .eq("id", params.id)
    .eq("client_id", workspace.clientId);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 400 });
  }
  if (!count) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
