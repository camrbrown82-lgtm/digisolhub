import { NextResponse } from "next/server";
import { requireHubSession } from "@/lib/auth";
import { DIGISOL_HOUSE_NAME } from "@/lib/branding";
import { channelInfo, trackingUrl, type TestVariant } from "@/lib/contentTests";
import { ensureAnalyticsSocialSchema } from "@/lib/ensureAnalyticsSocialSchema";
import { ensureContentTestSchema } from "@/lib/ensureContentTestSchema";
import { processSocialPostQueue } from "@/lib/social/dispatchSocialCampaign";
import { socialProviderConfigured } from "@/lib/social/providers";
import { getWorkspaceClient, resolveClientId } from "@/lib/workspace";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  const { supabase, error } = await requireHubSession();
  if (error) return error;
  await Promise.all([
    ensureAnalyticsSocialSchema().catch(() => null),
    ensureContentTestSchema().catch(() => null),
  ]);
  const active = await getWorkspaceClient(supabase);
  const clientId = (await resolveClientId(supabase)) || active?.id || null;

  const body = (await request.json().catch(() => null)) as {
    testId?: string;
    variant?: string;
    channel?: string;
    confirm?: boolean;
  } | null;
  const variant = body?.variant === "A" || body?.variant === "B" ? (body.variant as TestVariant) : null;
  const info = channelInfo(body?.channel || "");
  if (!variant || !info?.publish) {
    return NextResponse.json(
      { error: "Only Facebook and Instagram posts publish from the Hub." },
      { status: 400 },
    );
  }
  if (body?.confirm !== true) {
    return NextResponse.json({ error: "Confirm before publishing." }, { status: 400 });
  }
  if ((active?.name || "").toLowerCase() !== DIGISOL_HOUSE_NAME.toLowerCase()) {
    return NextResponse.json(
      {
        error: `Hub publishing posts to DigiSol's own accounts, so it's off for other companies. Copy the post and tracking link and post it on this company's page; visits still track.`,
      },
      { status: 409 },
    );
  }
  if (!socialProviderConfigured(info.publish)) {
    return NextResponse.json(
      {
        error: `${info.label} publishing isn't connected (see Integrations). Copy the post and tracking link and post it yourself; visits still track.`,
      },
      { status: 409 },
    );
  }

  const { data: test } = await supabase
    .from("content_tests")
    .select("id, client_id, slug, landing_url")
    .eq("id", body?.testId || "")
    .eq("client_id", clientId)
    .maybeSingle();
  if (!test) return NextResponse.json({ error: "Test not found for this company." }, { status: 404 });

  const { data: row } = await supabase
    .from("content_test_variants")
    .select("body, media_url")
    .eq("test_id", test.id)
    .eq("variant", variant)
    .maybeSingle();
  const copy = (row?.body as string | null)?.trim();
  if (!copy) {
    return NextResponse.json({ error: `Variant ${variant} has no post copy yet.` }, { status: 400 });
  }
  if (info.publish === "instagram" && !row?.media_url) {
    return NextResponse.json(
      { error: "Instagram needs an image. Attach a poster or image file to this variant." },
      { status: 400 },
    );
  }

  const link = trackingUrl(test.landing_url as string, test.slug as string, info.id, variant);
  const postBody = info.publish === "instagram" ? `${copy}\n\nLink in bio.` : `${copy}\n\n${link}`;
  const { data: post, error: insertError } = await supabase
    .from("social_posts")
    .insert({
      client_id: test.client_id,
      test_id: test.id,
      channel: info.publish,
      variant,
      body: postBody,
      media_url: row?.media_url || null,
      status: "queued",
      scheduled_at: new Date().toISOString(),
      metadata: { testId: test.id, trackingUrl: link, source: "content_test" },
    })
    .select("id")
    .single();
  if (insertError || !post) {
    return NextResponse.json({ error: insertError?.message || "Could not queue the post." }, { status: 400 });
  }

  const result = await processSocialPostQueue(supabase, {
    clientId: test.client_id as string,
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
