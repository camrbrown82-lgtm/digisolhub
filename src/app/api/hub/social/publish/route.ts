import { NextResponse } from "next/server";
import { requireHubSession } from "@/lib/auth";
import { adsWorkspace } from "@/lib/meta/adDrafts";
import { isWorkspaceMediaUrl } from "@/lib/posterSizes";
import { isSocialVideoUrl } from "@/lib/social/providers";
import { processSocialPostQueue } from "@/lib/social/dispatchSocialCampaign";
import { mountainInstant } from "@/lib/social/weekPlan";

export const dynamic = "force-dynamic";
export const maxDuration = 180;

const CHANNELS = new Set(["facebook", "instagram"]);

/** Queue a Kaylev draft, or publish it now on DigiSol's Facebook Page or Instagram. */
export async function POST(request: Request) {
  const { supabase, error } = await requireHubSession();
  if (error) return error;
  const workspace = await adsWorkspace(supabase);
  if ("error" in workspace) return workspace.error;

  const body = (await request.json().catch(() => null)) as {
    channel?: string;
    body?: string;
    mediaUrl?: string;
    when?: string;
    day?: string;
    hour?: number;
  } | null;
  const channel = body?.channel || "";
  const copy = body?.body?.trim() || "";
  if (!CHANNELS.has(channel)) {
    return NextResponse.json({ error: "Choose Facebook or Instagram." }, { status: 400 });
  }
  if (copy.length < 8) {
    return NextResponse.json({ error: "The post is too short." }, { status: 400 });
  }
  const mediaUrl = body?.mediaUrl?.trim() || "";
  if (mediaUrl && !isWorkspaceMediaUrl(mediaUrl)) {
    return NextResponse.json({ error: "Pick a file from this company's workspace." }, { status: 400 });
  }
  if (mediaUrl && /\.(webm|avi|mkv)(\?|$)/i.test(mediaUrl) && !isSocialVideoUrl(mediaUrl)) {
    return NextResponse.json({ error: "Facebook and Instagram need an MP4 or MOV." }, { status: 400 });
  }
  if (channel === "instagram" && !mediaUrl) {
    return NextResponse.json({ error: "Instagram needs an image or a video." }, { status: 400 });
  }

  let scheduledAt = new Date().toISOString();
  if (body?.when === "later") {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.day || "")) {
      return NextResponse.json({ error: "Pick a day to schedule." }, { status: 400 });
    }
    const hour = Number(body.hour);
    if (!Number.isFinite(hour) || hour < 8 || hour > 20) {
      return NextResponse.json({ error: "Pick an hour between 8 and 20 Mountain." }, { status: 400 });
    }
    const instant = mountainInstant(body.day!, Math.round(hour));
    if (instant.getTime() <= Date.now() + 60_000) {
      return NextResponse.json({ error: "That time has already passed. Pick a later hour." }, { status: 400 });
    }
    scheduledAt = instant.toISOString();
  }

  const { data: post, error: insertError } = await supabase
    .from("social_posts")
    .insert({
      client_id: workspace.clientId,
      channel,
      variant: "A",
      body: copy.slice(0, 4000),
      media_url: mediaUrl || null,
      status: "queued",
      scheduled_at: scheduledAt,
      metadata: { source: "social_studio" },
    })
    .select("id")
    .single();
  if (insertError || !post) {
    return NextResponse.json({ error: insertError?.message || "Could not queue the post." }, { status: 400 });
  }

  if (body?.when === "later") {
    return NextResponse.json({ ok: true, postId: post.id, scheduled: true });
  }

  const result = await processSocialPostQueue(supabase, {
    clientId: workspace.clientId,
    limit: 1,
    onlyIds: [post.id as string],
  });
  const outcome = result.results[0];
  if (!outcome?.ok) {
    return NextResponse.json(
      { error: outcome?.error || "Publishing failed.", postId: post.id },
      { status: 502 },
    );
  }
  return NextResponse.json({ ok: true, postId: post.id, externalId: outcome.externalId });
}
