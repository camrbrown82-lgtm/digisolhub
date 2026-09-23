import { NextResponse } from "next/server";
import { requireHubSession } from "@/lib/auth";
import {
  ensureResendOpenTracking,
  getResendTrackingStatus,
} from "@/lib/resendTracking";
import { syncResendEngagementFromApi } from "@/lib/resendStats";
import { contactIdsForClient, ensureDigisolClient } from "@/lib/workspace";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET — Resend domain open-tracking status for Hub Integrations. */
export async function GET() {
  const { error } = await requireHubSession();
  if (error) return error;

  const status = await getResendTrackingStatus();
  return NextResponse.json({ ok: true, tracking: status });
}

/**
 * POST — enable open/click tracking on RESEND_FROM domain, then backfill
 * recent sends from Resend last_event into Hub.
 */
export async function POST() {
  const { supabase, error } = await requireHubSession();
  if (error) return error;

  const tracking = await ensureResendOpenTracking({ force: true });
  const clientId = await ensureDigisolClient(supabase);
  const contactIds = clientId
    ? await contactIdsForClient(supabase, clientId)
    : [];
  const sync = await syncResendEngagementFromApi(supabase, {
    contactIds: contactIds.length ? contactIds : null,
    limit: 40,
  });

  return NextResponse.json({
    ok: true,
    tracking,
    sync,
    webhookUrl: "https://wwwdigisol.com/api/webhooks/resend",
    note: tracking.trackingReady
      ? "Open tracking is on. Confirm the Resend webhook includes email.opened / email.clicked."
      : tracking.dnsHint ||
        "Enable open tracking in Resend and add the tracking CNAME if shown.",
  });
}
