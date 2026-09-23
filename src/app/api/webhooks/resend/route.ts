import { NextResponse } from "next/server";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import { logAbVariantEngagement } from "@/lib/abVariantTracking";
import { emitHubEvent } from "@/lib/events";
import { promoteProspectOnEngagement } from "@/lib/prospectAudit/promote";

type ResendWebhook = {
  type?: string;
  created_at?: string;
  data?: {
    email_id?: string;
    created_at?: string;
    to?: string[];
  };
};

/**
 * Resend → Hub engagement.
 * Requires open/click tracking enabled on the sending domain
 * (see ensureResendOpenTracking) and this URL registered in Resend Webhooks.
 */
export async function POST(request: Request) {
  if (!hasAdminClient()) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  let payload: ResendWebhook;
  try {
    payload = (await request.json()) as ResendWebhook;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const resendId = payload.data?.email_id;
  if (!resendId) {
    return NextResponse.json({ ok: true, ignored: "missing_email_id" });
  }

  const admin = createAdminClient();
  const type = String(payload.type ?? "").toLowerCase();
  const eventAt =
    payload.data?.created_at ||
    payload.created_at ||
    new Date().toISOString();
  const patch: Record<string, string> = {};
  let event: "opened" | "clicked" | "bounced" | null = null;

  if (type === "email.opened" || type.includes("opened")) {
    patch.opened_at = eventAt;
    patch.status = "opened";
    event = "opened";
  } else if (type === "email.clicked" || type.includes("clicked")) {
    // Click implies open for Hub open-rate.
    patch.opened_at = eventAt;
    patch.clicked_at = eventAt;
    patch.status = "clicked";
    event = "clicked";
  } else if (type === "email.bounced" || type.includes("bounced")) {
    patch.bounced_at = eventAt;
    patch.status = "bounced";
    event = "bounced";
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: true, ignored: type || "unknown_type" });
  }

  // Prefer matching resend_id; never wipe an earlier opened_at with null.
  const { data: existing } = await admin
    .from("sends")
    .select("id, contact_id, campaign_id, variant, opened_at, clicked_at")
    .eq("resend_id", resendId)
    .maybeSingle();

  if (!existing?.id) {
    console.warn("[resend-webhook] no send for", resendId, type);
    // Still try prospect promote by resend_id alone.
    if (event === "opened" || event === "clicked") {
      await promoteProspectOnEngagement({
        db: admin,
        resendId,
        contactId: null,
        sendId: null,
        event,
      }).catch((err) => console.error("promoteProspectOnEngagement", err));
    }
    return NextResponse.json({
      ok: true,
      matched: false,
      resendId,
      type,
    });
  }

  const safePatch: Record<string, string> = { ...patch };
  if (existing.opened_at && safePatch.opened_at) {
    delete safePatch.opened_at;
  }
  if (existing.clicked_at && safePatch.clicked_at) {
    delete safePatch.clicked_at;
  }
  if (Object.keys(safePatch).length === 0) {
    return NextResponse.json({ ok: true, matched: true, already: true });
  }

  const { data: send } = await admin
    .from("sends")
    .update(safePatch)
    .eq("id", existing.id)
    .select("id, contact_id, campaign_id, variant")
    .maybeSingle();

  if (send?.contact_id && (patch.opened_at || existing.opened_at)) {
    await emitHubEvent("hub/email.opened", {
      contactId: send.contact_id,
      sendId: send.id,
    });
  }

  if (send && event) {
    await logAbVariantEngagement(admin, {
      sendId: send.id,
      contactId: send.contact_id,
      campaignId: send.campaign_id,
      variant: send.variant,
      event,
    }).catch((err) => {
      console.error("logAbVariantEngagement", err);
    });
  }

  if (event === "opened" || event === "clicked") {
    await promoteProspectOnEngagement({
      db: admin,
      resendId,
      contactId: send?.contact_id ?? existing.contact_id ?? null,
      sendId: send?.id ?? existing.id,
      event,
    }).catch((err) => {
      console.error("promoteProspectOnEngagement", err);
    });
  }

  return NextResponse.json({
    ok: true,
    matched: true,
    sendId: send?.id ?? existing.id,
    event,
  });
}
