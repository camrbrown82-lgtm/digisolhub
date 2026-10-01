import { NextResponse } from "next/server";
import { requireHubSession } from "@/lib/auth";
import { ensureMetaSchema } from "@/lib/ensureMetaSchema";
import { adsWorkspace, DRAFT_COLUMNS, draftFields, type AdDraftRow } from "@/lib/meta/adDrafts";
import { createPausedCampaign, maxDailyBudget, metaErrorMessage, setCampaignLive } from "@/lib/meta/ads";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Params = { params: { id: string } };

async function load(request: Request, id: string) {
  const { supabase, error } = await requireHubSession();
  if (error) return { error } as const;
  const workspace = await adsWorkspace(supabase);
  if ("error" in workspace) return { error: workspace.error } as const;
  await ensureMetaSchema().catch(() => null);
  const { data } = await supabase
    .from("meta_ad_drafts")
    .select(DRAFT_COLUMNS)
    .eq("id", id)
    .eq("client_id", workspace.clientId)
    .maybeSingle();
  if (!data) return { error: NextResponse.json({ error: "Draft not found." }, { status: 404 }) } as const;
  return { supabase, draft: data as unknown as AdDraftRow } as const;
}

/** PATCH — edit a draft before it goes to Meta. */
export async function PATCH(request: Request, { params }: Params) {
  const loaded = await load(request, params.id);
  if ("error" in loaded) return loaded.error;
  if (loaded.draft.status !== "draft" && loaded.draft.status !== "failed") {
    return NextResponse.json({ error: "This campaign is already in Meta. Edit it in Ads Manager." }, { status: 400 });
  }
  const body = ((await request.json().catch(() => null)) ?? {}) as Record<string, unknown>;
  const { data, error } = await loaded.supabase
    .from("meta_ad_drafts")
    .update({ ...draftFields(body), updated_at: new Date().toISOString() })
    .eq("id", params.id)
    .select(DRAFT_COLUMNS)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, draft: data });
}

/** DELETE — only drafts that never reached Meta. */
export async function DELETE(request: Request, { params }: Params) {
  const loaded = await load(request, params.id);
  if ("error" in loaded) return loaded.error;
  if (loaded.draft.meta_campaign_id) {
    return NextResponse.json({ error: "This campaign is in Meta. Pause or delete it in Ads Manager." }, { status: 400 });
  }
  await loaded.supabase.from("meta_ad_drafts").delete().eq("id", params.id);
  return NextResponse.json({ ok: true });
}

/** POST { action: "create" | "launch" | "pause" } */
export async function POST(request: Request, { params }: Params) {
  const loaded = await load(request, params.id);
  if ("error" in loaded) return loaded.error;
  const { supabase, draft } = loaded;
  const body = (await request.json().catch(() => null)) as { action?: string } | null;
  const now = new Date().toISOString();

  const save = async (patch: Partial<AdDraftRow>) => {
    const { data } = await supabase
      .from("meta_ad_drafts")
      .update({ ...patch, updated_at: now })
      .eq("id", params.id)
      .select(DRAFT_COLUMNS)
      .single();
    return data;
  };

  try {
    if (body?.action === "create") {
      if (draft.meta_campaign_id) return NextResponse.json({ error: "Already created in Meta." }, { status: 400 });
      const created = await createPausedCampaign(draft);
      const saved = await save({
        status: "ready",
        error: null,
        meta_campaign_id: created.campaignId,
        meta_adset_id: created.adsetId,
        meta_creative_id: created.creativeId,
        meta_ad_id: created.adId,
      });
      return NextResponse.json({ ok: true, draft: saved, audienceNote: created.audienceNote });
    }
    if (body?.action === "launch") {
      if (!draft.meta_campaign_id) return NextResponse.json({ error: "Create it in Meta first." }, { status: 400 });
      if (draft.daily_budget > maxDailyBudget()) {
        return NextResponse.json({ error: `Budget is over the ${maxDailyBudget()}/day cap.` }, { status: 400 });
      }
      await setCampaignLive(draft, true);
      const saved = await save({ status: "active", error: null, launched_at: draft.launched_at || now });
      return NextResponse.json({ ok: true, draft: saved });
    }
    if (body?.action === "pause") {
      if (!draft.meta_campaign_id) return NextResponse.json({ error: "Not in Meta yet." }, { status: 400 });
      await setCampaignLive(draft, false);
      const saved = await save({ status: "paused", error: null });
      return NextResponse.json({ ok: true, draft: saved });
    }
    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (err) {
    const message = metaErrorMessage(err);
    const saved = await save(
      body?.action === "create" ? { status: "failed", error: message } : { error: message },
    );
    return NextResponse.json({ error: message, draft: saved }, { status: 502 });
  }
}
