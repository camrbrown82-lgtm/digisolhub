import type { SupabaseClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { getResendApiKey } from "@/lib/email";
import { promoteProspectOnEngagement } from "@/lib/prospectAudit/promote";

export type ResendAccountMetrics = {
  configured: boolean;
  error?: string;
  days: number;
  sent: number;
  delivered: number;
  opened: number;
  uniqueOpened: number;
  clicked: number;
  uniqueClicked: number;
  bounced: number;
  openRate: number | null;
  clickRate: number | null;
};

type MetricsTotals = Record<string, number | null | undefined>;

/**
 * Pull account-level Resend metrics (opens/clicks/etc.) for the last N days.
 * Requires RESEND_API_KEY. Used by Hub Analytics + DigiSol agent tools.
 */
export async function fetchResendAccountMetrics(
  days = 14,
): Promise<ResendAccountMetrics> {
  const apiKey = getResendApiKey();
  const lookback = Math.min(30, Math.max(1, Math.floor(days)));
  if (!apiKey) {
    return {
      configured: false,
      error: "RESEND_API_KEY missing",
      days: lookback,
      sent: 0,
      delivered: 0,
      opened: 0,
      uniqueOpened: 0,
      clicked: 0,
      uniqueClicked: 0,
      bounced: 0,
      openRate: null,
      clickRate: null,
    };
  }

  const end = new Date();
  const start = new Date(Date.now() - lookback * 24 * 60 * 60 * 1000);
  const params = new URLSearchParams({
    start_date: start.toISOString(),
    end_date: end.toISOString(),
    timezone: "UTC",
    metrics: [
      "sent",
      "delivered",
      "opened",
      "unique_opened",
      "clicked",
      "unique_clicked",
      "bounced",
      "open_rate",
      "click_rate",
    ].join(","),
  });

  try {
    const res = await fetch(`https://api.resend.com/emails/metrics?${params}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });
    const json = (await res.json().catch(() => ({}))) as {
      totals?: MetricsTotals;
      data?: Array<{ totals?: MetricsTotals }>;
      message?: string;
      name?: string;
      error?: string;
    };

    if (!res.ok) {
      return {
        configured: true,
        error:
          json.message ||
          json.error ||
          json.name ||
          `Resend metrics HTTP ${res.status}`,
        days: lookback,
        sent: 0,
        delivered: 0,
        opened: 0,
        uniqueOpened: 0,
        clicked: 0,
        uniqueClicked: 0,
        bounced: 0,
        openRate: null,
        clickRate: null,
      };
    }

    const totals = json.totals || json.data?.[0]?.totals || {};
    return {
      configured: true,
      days: lookback,
      sent: num(totals.sent),
      delivered: num(totals.delivered),
      opened: num(totals.opened),
      uniqueOpened: num(totals.unique_opened),
      clicked: num(totals.clicked),
      uniqueClicked: num(totals.unique_clicked),
      bounced: num(totals.bounced),
      openRate: rate(totals.open_rate),
      clickRate: rate(totals.click_rate),
    };
  } catch (err) {
    return {
      configured: true,
      error: err instanceof Error ? err.message : "Resend metrics fetch failed",
      days: lookback,
      sent: 0,
      delivered: 0,
      opened: 0,
      uniqueOpened: 0,
      clicked: 0,
      uniqueClicked: 0,
      bounced: 0,
      openRate: null,
      clickRate: null,
    };
  }
}

/**
 * Backfill Hub `sends` open/click timestamps from Resend `last_event`
 * when the webhook has not updated them yet.
 */
export async function syncResendEngagementFromApi(
  db: SupabaseClient,
  opts?: { contactIds?: string[] | null; limit?: number },
) {
  const apiKey = getResendApiKey();
  if (!apiKey) {
    return { synced: 0, checked: 0, skipped: true as const, reason: "no_api_key" };
  }

  const limit = Math.min(40, Math.max(1, opts?.limit ?? 25));
  let query = db
    .from("sends")
    .select("id, resend_id, contact_id, opened_at, clicked_at, bounced_at, status")
    .not("resend_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (opts?.contactIds && opts.contactIds.length > 0) {
    query = query.in("contact_id", opts.contactIds);
  }

  const { data: rows, error } = await query;
  if (error || !rows?.length) {
    return {
      synced: 0,
      checked: 0,
      skipped: false as const,
      reason: error?.message || "no_sends",
    };
  }

  const resend = new Resend(apiKey);
  let synced = 0;

  for (const row of rows) {
    const resendId = row.resend_id as string | null;
    if (!resendId) continue;

    const { data, error: getError } = await resend.emails.get(resendId);
    if (getError || !data) continue;

    const lastEvent = String(
      (data as { last_event?: string }).last_event || "",
    ).toLowerCase();
    if (!lastEvent) continue;

    const patch: Record<string, string> = {};
    const now = new Date().toISOString();
    let promoteEvent: "opened" | "clicked" | null = null;

    if (
      (lastEvent === "opened" || lastEvent === "clicked") &&
      !row.opened_at
    ) {
      patch.opened_at = now;
      patch.status = lastEvent === "clicked" ? "clicked" : "opened";
      promoteEvent = "opened";
    }
    if (lastEvent === "clicked" && !row.clicked_at) {
      patch.clicked_at = now;
      patch.status = "clicked";
      promoteEvent = "clicked";
    }
    if (
      (lastEvent === "bounced" || lastEvent.includes("bounce")) &&
      !row.bounced_at
    ) {
      patch.bounced_at = now;
      patch.status = "bounced";
    }

    if (Object.keys(patch).length === 0) continue;

    await db.from("sends").update(patch).eq("id", row.id);
    synced += 1;

    if (promoteEvent) {
      await promoteProspectOnEngagement({
        db,
        resendId,
        contactId: row.contact_id,
        sendId: row.id,
        event: promoteEvent,
      }).catch(() => null);
    }
  }

  return { synced, checked: rows.length, skipped: false as const };
}

function num(value: unknown) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function rate(value: unknown) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  // Resend may return 0–1 or 0–100 depending on version — normalize to percent.
  return n <= 1 ? Math.round(n * 1000) / 10 : Math.round(n * 10) / 10;
}
