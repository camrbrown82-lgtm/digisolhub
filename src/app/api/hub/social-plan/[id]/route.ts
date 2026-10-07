import { NextResponse } from "next/server";
import { requireHubSession } from "@/lib/auth";
import { ensureAnalyticsSocialSchema } from "@/lib/ensureAnalyticsSocialSchema";
import { ensureMetaSchema } from "@/lib/ensureMetaSchema";
import { adsWorkspace } from "@/lib/meta/adDrafts";
import { maxDailyBudget } from "@/lib/meta/ads";
import { loadPlan, runApprovedPlan } from "@/lib/social/runWeekPlan";
import { planItems } from "@/lib/social/weekPlan";
import { companySiteUrl } from "@/lib/workspace";
import { isBusinessCardAsset } from "@/lib/posterArchive";
import { isStoredPosterUrl } from "@/lib/posterSizes";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Params = { params: { id: string } };

/** PATCH { items } saves edits. POST { action: "approve", items? } runs the plan. */
export async function PATCH(request: Request, { params }: Params) {
  const { supabase, error } = await requireHubSession();
  if (error) return error;
  const workspace = await adsWorkspace(supabase);
  if ("error" in workspace) return workspace.error;
  await ensureAnalyticsSocialSchema().catch(() => null);
  const plan = await loadPlan(supabase, params.id, workspace.clientId);
  if (!plan) return NextResponse.json({ error: "Plan not found." }, { status: 404 });
  if (plan.status !== "draft") return NextResponse.json({ error: "This plan is already running." }, { status: 400 });

  const body = ((await request.json().catch(() => null)) ?? {}) as { items?: unknown };
  const posters = await posterUrls(supabase, workspace.clientId);
  const items = planItems(body.items, posters, companySiteUrl(workspace.client));
  const { data, error: updateError } = await supabase
    .from("social_plans")
    .update({ items, updated_at: new Date().toISOString() })
    .eq("id", params.id)
    .select("id, status, brief, weekly_budget, summary, why, items, error, created_at, approved_at")
    .single();
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
  return NextResponse.json({ ok: true, plan: data });
}

export async function POST(request: Request, { params }: Params) {
  const { supabase, error } = await requireHubSession();
  if (error) return error;
  const workspace = await adsWorkspace(supabase);
  if ("error" in workspace) return workspace.error;
  await Promise.all([ensureAnalyticsSocialSchema().catch(() => null), ensureMetaSchema().catch(() => null)]);
  const plan = await loadPlan(supabase, params.id, workspace.clientId);
  if (!plan) return NextResponse.json({ error: "Plan not found." }, { status: 404 });

  const body = (await request.json().catch(() => null)) as { action?: string; items?: unknown } | null;
  if (body?.action === "cancel") {
    if (plan.status !== "draft") return NextResponse.json({ error: "Only a draft can be dropped." }, { status: 400 });
    const { data } = await supabase
      .from("social_plans")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", params.id)
      .select("id, status, brief, weekly_budget, summary, why, items, error, created_at, approved_at")
      .single();
    return NextResponse.json({ ok: true, plan: data });
  }
  if (body?.action !== "approve") return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  if (plan.status !== "draft") return NextResponse.json({ error: "This plan is already running." }, { status: 400 });

  const posters = await posterUrls(supabase, workspace.clientId);
  const items = body.items ? planItems(body.items, posters, companySiteUrl(workspace.client)) : plan.items;
  const saved = { ...plan, client_id: workspace.clientId, items };
  await supabase.from("social_plans").update({ items, updated_at: new Date().toISOString() }).eq("id", params.id);
  try {
    const running = await runApprovedPlan(supabase, saved, maxDailyBudget());
    return NextResponse.json({ ok: true, plan: running });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not run the plan.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

async function posterUrls(db: Parameters<typeof loadPlan>[0], clientId: string) {
  const { data } = await db
    .from("assets")
    .select("public_url, filename, notes")
    .eq("bucket", "ai-posters")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(12);
  return (data ?? [])
    .filter((row) => !isBusinessCardAsset(row))
    .map((row) => row.public_url as string)
    .filter(isStoredPosterUrl);
}
