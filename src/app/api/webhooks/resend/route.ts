import { NextResponse } from "next/server";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import { logAbVariantEngagement } from "@/lib/abVariantTracking";
import { emitHubEvent } from "@/lib/events";
import { promoteProspectOnEngagement } from "@/lib/prospectAudit/promote";

type ResendWebhook = {
  type?: string;
  data?: {
    email_id?: string;
    created_at?: string;
  };
};

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
    return NextResponse.json({ ok: true });
  }

  const admin = createAdminClient();
  const type = payload.type ?? "";
  const patch: Record<string, string> = {};
  let event: "opened" | "clicked" | "bounced" | null = null;

  if (type.includes("opened") || type === "email.opened") {
    patch.opened_at = payload.data?.created_at ?? new Date().toISOString();
    patch.status = "opened";
    event = "opened";
  } else if (type.includes("clicked") || type === "email.clicked") {
    patch.clicked_at = payload.data?.created_at ?? new Date().toISOString();
    patch.status = "clicked";
    event = "clicked";
  } else if (type.includes("bounced") || type === "email.bounced") {
    patch.bounced_at = payload.data?.created_at ?? new Date().toISOString();
    patch.status = "bounced";
    event = "bounced";
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: true });
  }

  const { data: send } = await admin
    .from("sends")
    .update(patch)
    .eq("resend_id", resendId)
    .select("id, contact_id, campaign_id, variant")
    .maybeSingle();

  if (send?.contact_id && patch.opened_at) {
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

  // Cold prospect audit → active DigiSol lead on open/click.
  if (event === "opened" || event === "clicked") {
    await promoteProspectOnEngagement({
      db: admin,
      resendId,
      contactId: send?.contact_id ?? null,
      sendId: send?.id ?? null,
      event,
    }).catch((err) => {
      console.error("promoteProspectOnEngagement", err);
    });
  }

  return NextResponse.json({ ok: true });
}
