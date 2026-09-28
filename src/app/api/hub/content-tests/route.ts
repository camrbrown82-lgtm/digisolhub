import { NextResponse } from "next/server";
import { requireHubSession } from "@/lib/auth";
import {
  isContentTestChannel,
  slugifyTestName,
  TEST_VARIANTS,
  type ChannelMetrics,
  type TestVariant,
  type VariantMetrics,
} from "@/lib/contentTests";
import { ensureContentTestSchema } from "@/lib/ensureContentTestSchema";
import { getWorkspaceClient, resolveClientId } from "@/lib/workspace";

export const dynamic = "force-dynamic";

type VariantInput = {
  variant?: string;
  label?: string;
  body?: string;
  assetId?: string | null;
  emailTemplateId?: string | null;
  metrics?: VariantMetrics;
};

function text(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function isVariant(value: unknown): value is TestVariant {
  return value === "A" || value === "B";
}

function cleanMetrics(input: unknown): VariantMetrics {
  if (!input || typeof input !== "object") return {};
  const out: VariantMetrics = {};
  for (const [channel, raw] of Object.entries(input as Record<string, unknown>)) {
    if (!isContentTestChannel(channel) || !raw || typeof raw !== "object") continue;
    const metrics: ChannelMetrics = {};
    for (const key of ["impressions", "clicks", "spend", "engagements"] as const) {
      const value = Number((raw as Record<string, unknown>)[key]);
      if (Number.isFinite(value) && value >= 0) metrics[key] = Math.round(value * 100) / 100;
    }
    out[channel] = metrics;
  }
  return out;
}

async function scope() {
  const { supabase, error } = await requireHubSession();
  if (error) return { error } as const;
  await ensureContentTestSchema().catch(() => null);
  const active = await getWorkspaceClient(supabase);
  const clientId = (await resolveClientId(supabase)) || active?.id || null;
  return { supabase, clientId } as const;
}

export async function POST(request: Request) {
  const ctx = await scope();
  if ("error" in ctx) return ctx.error;
  const { supabase, clientId } = ctx;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;

  const name = text(body?.name, 120);
  const landing = text(body?.landingUrl, 500);
  if (!name) return NextResponse.json({ error: "Give the test a name." }, { status: 400 });
  let landingUrl: string;
  try {
    const url = new URL(landing.startsWith("http") ? landing : `https://${landing}`);
    landingUrl = url.toString();
  } catch {
    return NextResponse.json({ error: "Landing page must be a full web address." }, { status: 400 });
  }
  const channels = Array.isArray(body?.channels)
    ? Array.from(new Set((body!.channels as unknown[]).filter((c): c is string => typeof c === "string" && isContentTestChannel(c))))
    : [];
  if (channels.length === 0) {
    return NextResponse.json({ error: "Pick at least one channel." }, { status: 400 });
  }
  const variantInputs = (Array.isArray(body?.variants) ? body!.variants : []) as VariantInput[];

  const base = slugifyTestName(text(body?.slug, 60) || name);
  const { data: taken } = await supabase
    .from("content_tests")
    .select("slug")
    .eq("client_id", clientId)
    .like("slug", `${base}%`);
  const used = new Set((taken ?? []).map((row) => row.slug as string));
  let slug = base;
  for (let n = 2; used.has(slug); n += 1) slug = `${base}-${n}`;

  const source = body?.source && typeof body.source === "object" ? body.source : {};
  const { data: test, error } = await supabase
    .from("content_tests")
    .insert({
      client_id: clientId,
      name,
      slug,
      goal: text(body?.goal, 1000) || null,
      hypothesis: text(body?.hypothesis, 1000) || null,
      landing_url: landingUrl,
      channels,
      status: "live",
      source,
    })
    .select("id, slug")
    .single();
  if (error || !test) {
    return NextResponse.json({ error: error?.message || "Could not save the test." }, { status: 400 });
  }

  const assetIds = variantInputs.map((v) => v.assetId).filter((id): id is string => Boolean(id));
  const { data: assets } = assetIds.length
    ? await supabase.from("assets").select("id, public_url, mime_type").in("id", assetIds)
    : { data: [] as { id: string; public_url: string | null; mime_type: string | null }[] };
  const assetById = new Map((assets ?? []).map((row) => [row.id, row]));

  const rows = TEST_VARIANTS.map((variant) => {
    const input = variantInputs.find((v) => v.variant === variant) ?? {};
    const asset = input.assetId ? assetById.get(input.assetId) : null;
    return {
      test_id: test.id,
      variant,
      label: text(input.label, 120) || `Variant ${variant}`,
      body: text(input.body, 3000) || null,
      asset_id: asset ? input.assetId : null,
      email_template_id: input.emailTemplateId || null,
      media_url: asset?.public_url && !(asset.mime_type || "").startsWith("video/") ? asset.public_url : null,
      metrics: {},
    };
  });
  const { error: variantError } = await supabase.from("content_test_variants").insert(rows);
  if (variantError) {
    await supabase.from("content_tests").delete().eq("id", test.id);
    return NextResponse.json({ error: variantError.message }, { status: 400 });
  }
  return NextResponse.json({ id: test.id, slug: test.slug });
}

export async function PATCH(request: Request) {
  const ctx = await scope();
  if ("error" in ctx) return ctx.error;
  const { supabase, clientId } = ctx;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const id = text(body?.id, 64);
  const { data: test } = await supabase
    .from("content_tests")
    .select("id")
    .eq("id", id)
    .eq("client_id", clientId)
    .maybeSingle();
  if (!test) return NextResponse.json({ error: "Test not found for this company." }, { status: 404 });

  const update: Record<string, unknown> = {};
  if (body?.status === "live" || body?.status === "completed" || body?.status === "draft") {
    update.status = body.status;
  }
  if ("winnerVariant" in (body ?? {})) {
    update.winner_variant = isVariant(body?.winnerVariant) ? body!.winnerVariant : null;
  }
  if (Object.keys(update).length) {
    const { error } = await supabase.from("content_tests").update(update).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  for (const input of (Array.isArray(body?.variants) ? body!.variants : []) as VariantInput[]) {
    if (!isVariant(input.variant)) continue;
    const patch: Record<string, unknown> = {};
    if (input.metrics) patch.metrics = cleanMetrics(input.metrics);
    if (typeof input.body === "string") patch.body = text(input.body, 3000) || null;
    if (typeof input.label === "string") patch.label = text(input.label, 120) || `Variant ${input.variant}`;
    if (!Object.keys(patch).length) continue;
    const { error } = await supabase
      .from("content_test_variants")
      .update(patch)
      .eq("test_id", id)
      .eq("variant", input.variant);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const ctx = await scope();
  if ("error" in ctx) return ctx.error;
  const { supabase, clientId } = ctx;
  const id = new URL(request.url).searchParams.get("id") || "";
  const { error } = await supabase
    .from("content_tests")
    .delete()
    .eq("id", id)
    .eq("client_id", clientId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
