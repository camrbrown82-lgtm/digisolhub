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

export type ReconciledEmailStats = {
  sends: number;
  opened: number;
  clicked: number;
  openRate: number;
  clickRate: number;
  /** Where display opens/clicks came from after reconcile */
  engagementSource: "hub" | "resend";
  synced: number;
  resend: ResendAccountMetrics;
};

type MetricsTotals = Record<string, number | null | undefined>;

const METRICS_TIMEOUT_MS = 2500;
const SYNC_TIMEOUT_MS = 4000;

/**
 * Pull account-level Resend metrics (opens/clicks/etc.) for the last N days.
 * Hard-timeout so Hub Analytics never hangs on Resend.
 */
export async function fetchResendAccountMetrics(
  days = 14,
): Promise<ResendAccountMetrics> {
  const apiKey = getResendApiKey();
  const lookback = Math.min(30, Math.max(1, Math.floor(days)));
  const empty = (error?: string): ResendAccountMetrics => ({
    configured: Boolean(apiKey),
    error,
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
  });

  if (!apiKey) return empty("RESEND_API_KEY missing");

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

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), METRICS_TIMEOUT_MS);

  try {
    const res = await fetch(`https://api.resend.com/emails/metrics?${params}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      cache: "no-store",
      signal: controller.signal,
    });
    const json = (await res.json().catch(() => ({}))) as {
      totals?: MetricsTotals;
      data?: Array<{ totals?: MetricsTotals }>;
      message?: string;
      name?: string;
      error?: string;
    };

    if (!res.ok) {
      return empty(
        json.message ||
          json.error ||
          json.name ||
          `Resend metrics HTTP ${res.status}`,
      );
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
    const aborted =
      err instanceof Error &&
      (err.name === "AbortError" || /aborted/i.test(err.message));
    return empty(
      aborted
        ? "Resend metrics timed out"
        : err instanceof Error
          ? err.message
          : "Resend metrics fetch failed",
    );
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Backfill Hub `sends` open/click timestamps from Resend `last_event`.
 * Parallel + capped so it can safely run during Analytics reconcile.
 */
export async function syncResendEngagementFromApi(
  db: SupabaseClient,
  opts?: { contactIds?: string[] | null; limit?: number },
) {
  const apiKey = getResendApiKey();
  if (!apiKey) {
    return { synced: 0, checked: 0, skipped: true as const, reason: "no_api_key" };
  }

  const limit = Math.min(20, Math.max(1, opts?.limit ?? 12));
  let query = db
    .from("sends")
    .select("id, resend_id, contact_id, opened_at, clicked_at, bounced_at, status")
    .not("resend_id", "is", null)
    .is("opened_at", null)
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
  const results = await Promise.all(
    rows.map(async (row) => {
      const resendId = row.resend_id as string | null;
      if (!resendId) return false;

      const { data, error: getError } = await resend.emails.get(resendId);
      if (getError || !data) return false;

      const lastEvent = String(
        (data as { last_event?: string }).last_event || "",
      ).toLowerCase();
      if (!lastEvent) return false;

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

      if (Object.keys(patch).length === 0) return false;

      await db.from("sends").update(patch).eq("id", row.id);

      if (promoteEvent) {
        await promoteProspectOnEngagement({
          db,
          resendId,
          contactId: row.contact_id,
          sendId: row.id,
          event: promoteEvent,
        }).catch(() => null);
      }
      return true;
    }),
  );

  return {
    synced: results.filter(Boolean).length,
    checked: rows.length,
    skipped: false as const,
  };
}

/**
 * One source of truth for Hub Analytics + Performance dashboard.
 * Light sync (time-boxed) → Hub recount → if Hub still empty, use Resend uniques.
 */
export async function reconcileHubEmailStats(
  db: SupabaseClient,
  contactIds: string[] | null,
): Promise<ReconciledEmailStats> {
  const emptySends = !contactIds || contactIds.length === 0;

  const syncPromise = emptySends
    ? Promise.resolve({ synced: 0, checked: 0, skipped: true as const })
    : Promise.race([
        syncResendEngagementFromApi(db, {
          contactIds,
          limit: 12,
        }).catch(() => ({
          synced: 0,
          checked: 0,
          skipped: true as const,
        })),
        new Promise<{ synced: number; checked: number; skipped: true }>(
          (resolve) =>
            setTimeout(
              () => resolve({ synced: 0, checked: 0, skipped: true }),
              SYNC_TIMEOUT_MS,
            ),
        ),
      ]);

  const [resend, syncResult] = await Promise.all([
    fetchResendAccountMetrics(14),
    syncPromise,
  ]);

  let sends = 0;
  let hubOpened = 0;
  let hubClicked = 0;

  if (!emptySends && contactIds) {
    let sendsQuery = db
      .from("sends")
      .select("id", { count: "exact", head: true })
      .in("contact_id", contactIds);
    let openedQuery = db
      .from("sends")
      .select("id", { count: "exact", head: true })
      .in("contact_id", contactIds)
      .not("opened_at", "is", null);
    let clickedQuery = db
      .from("sends")
      .select("id", { count: "exact", head: true })
      .in("contact_id", contactIds)
      .not("clicked_at", "is", null);

    const [sendsRes, openedRes, clickedRes] = await Promise.all([
      sendsQuery,
      openedQuery,
      clickedQuery,
    ]);
    sends = sendsRes.count ?? 0;
    hubOpened = openedRes.count ?? 0;
    hubClicked = clickedRes.count ?? 0;
  }

  const resendOpened = resend.uniqueOpened || resend.opened;
  const resendClicked = resend.uniqueClicked || resend.clicked;

  // Prefer Hub after sync; if webhook never fired, mirror Resend uniques
  // so Performance + Hub cards show the same engagement numbers.
  let opened = hubOpened;
  let clicked = hubClicked;
  let engagementSource: "hub" | "resend" = "hub";

  if (hubOpened === 0 && resendOpened > 0) {
    opened = sends > 0 ? Math.min(sends, resendOpened) : resendOpened;
    engagementSource = "resend";
  }
  if (hubClicked === 0 && resendClicked > 0) {
    clicked = sends > 0 ? Math.min(sends, resendClicked) : resendClicked;
    engagementSource = "resend";
  }

  const openRate = sends
    ? Math.round((opened / sends) * 1000) / 10
    : resend.openRate ?? 0;
  const clickRate = sends
    ? Math.round((clicked / sends) * 1000) / 10
    : resend.clickRate ?? 0;

  return {
    sends,
    opened,
    clicked,
    openRate,
    clickRate,
    engagementSource,
    synced: "synced" in syncResult ? syncResult.synced : 0,
    resend,
  };
}

function num(value: unknown) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function rate(value: unknown) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  return n <= 1 ? Math.round(n * 1000) / 10 : Math.round(n * 10) / 10;
}
