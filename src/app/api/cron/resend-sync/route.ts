import { NextResponse } from "next/server";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import { syncResendEngagementFromApi } from "@/lib/resendStats";
import { cronAuthorized } from "@/lib/security";
import { contactIdsForClient, ensureDigisolClient } from "@/lib/workspace";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Backfill Hub send open/click timestamps from Resend last_event.
 * GET /api/cron/resend-sync
 *
 * Keeps Performance dashboard Hub counts aligned with Resend without
 * blocking Admin page loads (runs on a schedule).
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
    const db = createAdminClient();
    const clientId = await ensureDigisolClient(db);
    const contactIds = clientId
      ? await contactIdsForClient(db, clientId)
      : [];
    const result = await syncResendEngagementFromApi(db, {
      contactIds: contactIds.length ? contactIds : null,
      limit: 20,
    });
    return NextResponse.json({ ok: true, clientId, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Resend sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
