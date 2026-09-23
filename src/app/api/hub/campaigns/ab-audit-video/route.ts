import { NextResponse } from "next/server";
import { requireHubSession } from "@/lib/auth";
import {
  getAbAuditVideoCampaignStatus,
  markAbAuditVideoPostPublished,
  startAbAuditVideoCampaign,
} from "@/lib/campaigns/abAuditVideo7Day";
import { ensureAnalyticsSocialSchema } from "@/lib/ensureAnalyticsSocialSchema";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * DigiSol Alberta Facebook Group — 7-day / 5-variant audit video campaign.
 * GET  → status + posts for Hub monitoring
 * POST → initialize campaign + queue posts
 * PATCH → { postId, action: "mark_published" }
 */
export async function GET() {
  const { supabase, error } = await requireHubSession();
  if (error) return error;

  await ensureAnalyticsSocialSchema().catch(() => null);
  try {
    const status = await getAbAuditVideoCampaignStatus(supabase);
    return NextResponse.json({ ok: true, campaign: status });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Status failed" },
      { status: 500 },
    );
  }
}

export async function POST() {
  const { supabase, error } = await requireHubSession();
  if (error) return error;

  await ensureAnalyticsSocialSchema().catch(() => null);
  try {
    const started = await startAbAuditVideoCampaign(supabase);
    return NextResponse.json({ ok: true, ...started });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Start failed" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const { supabase, error } = await requireHubSession();
  if (error) return error;

  let body: { postId?: string; action?: string };
  try {
    body = (await request.json()) as { postId?: string; action?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.action !== "mark_published" || !body.postId?.trim()) {
    return NextResponse.json(
      { error: "Provide postId and action=mark_published" },
      { status: 400 },
    );
  }

  try {
    const post = await markAbAuditVideoPostPublished(
      supabase,
      body.postId.trim(),
    );
    return NextResponse.json({ ok: true, post });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Update failed" },
      { status: 500 },
    );
  }
}
