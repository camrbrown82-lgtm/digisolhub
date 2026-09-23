import { NextResponse } from "next/server";
import { ensureAnalyticsSocialSchema } from "@/lib/ensureAnalyticsSocialSchema";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import { cronAuthorized } from "@/lib/security";
import { processSocialPostQueue } from "@/lib/social/dispatchSocialCampaign";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Process queued social campaign posts (Meta / LinkedIn).
 * GET /api/cron/social-dispatch
 */
export async function GET(request: Request) {
  if (!cronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasAdminClient()) {
    return NextResponse.json(
      { error: "Supabase service role is not configured" },
      { status: 503 },
    );
  }

  try {
    await ensureAnalyticsSocialSchema().catch(() => null);
    const db = createAdminClient();
    const result = await processSocialPostQueue(db, { limit: 10 });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Social dispatch failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
