import type { SupabaseClient } from "@supabase/supabase-js";
import type { CampaignChannel } from "@/lib/campaignChannels";

/** Canonical event types for Hub Performance + agent telemetry. */
export const ANALYTICS_EVENT_TYPES = [
  "visitor_chat_lead",
  "website_audit_run",
  "email_sent",
  "social_post_queued",
  "social_post_published",
  "social_post_failed",
  "agent_tool",
  "budget_check",
] as const;

export type AnalyticsEventType = (typeof ANALYTICS_EVENT_TYPES)[number] | string;

export type AnalyticsEventInput = {
  companyId?: string | null;
  eventType: AnalyticsEventType;
  channel?: CampaignChannel | string | null;
  success?: boolean;
  tokenCost?: number;
  contactId?: string | null;
  campaignId?: string | null;
  visitorId?: string | null;
  source?: string | null;
  metadata?: Record<string, unknown>;
};

/**
 * Fire-and-forget friendly telemetry insert.
 * Never throws to callers — agent actions must not fail because logging failed.
 */
export async function logAnalyticsEvent(
  db: SupabaseClient,
  input: AnalyticsEventInput,
): Promise<{ id: string | null; ok: boolean; error?: string }> {
  try {
    const { data, error } = await db
      .from("analytics_events")
      .insert({
        company_id: input.companyId || null,
        event_type: input.eventType,
        channel: input.channel || null,
        success: input.success !== false,
        token_cost: Math.max(0, Math.floor(input.tokenCost ?? 0)),
        contact_id: input.contactId || null,
        campaign_id: input.campaignId || null,
        visitor_id: input.visitorId || null,
        source: input.source || null,
        metadata: input.metadata ?? {},
      })
      .select("id")
      .maybeSingle();

    if (error) {
      console.warn("[analytics_events]", error.message);
      return { id: null, ok: false, error: error.message };
    }
    return { id: data?.id ?? null, ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "analytics_events insert failed";
    console.warn("[analytics_events]", message);
    return { id: null, ok: false, error: message };
  }
}

export type AnalyticsEventRow = {
  event_type: string;
  channel: string | null;
  success: boolean;
  token_cost: number;
  created_at: string;
};

export type AnalyticsEventsSummary = {
  total: number;
  successRate: number;
  tokenCost: number;
  byType: { label: string; value: number }[];
  byChannel: { label: string; value: number }[];
  daily: { day: string; value: number }[];
  weakPoints: { label: string; value: number }[];
};

/** Aggregate recent analytics_events for Performance dashboard charts. */
export function summarizeAnalyticsEvents(
  rows: AnalyticsEventRow[],
): AnalyticsEventsSummary {
  const byType = new Map<string, number>();
  const byChannel = new Map<string, number>();
  const byDay = new Map<string, number>();
  const failures = new Map<string, number>();
  let successCount = 0;
  let tokenCost = 0;

  for (const row of rows) {
    byType.set(row.event_type, (byType.get(row.event_type) || 0) + 1);
    if (row.channel) {
      byChannel.set(row.channel, (byChannel.get(row.channel) || 0) + 1);
    }
    const day = row.created_at.slice(0, 10);
    byDay.set(day, (byDay.get(day) || 0) + 1);
    tokenCost += row.token_cost || 0;
    if (row.success) successCount += 1;
    else failures.set(row.event_type, (failures.get(row.event_type) || 0) + 1);
  }

  const total = rows.length;
  const rank = (map: Map<string, number>) =>
    Array.from(map.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);

  return {
    total,
    successRate: total ? Math.round((successCount / total) * 1000) / 10 : 0,
    tokenCost,
    byType: rank(byType).slice(0, 8),
    byChannel: rank(byChannel).slice(0, 8),
    daily: Array.from(byDay.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, value]) => ({ day, value })),
    weakPoints: rank(failures).slice(0, 5),
  };
}

export async function fetchAnalyticsEventsSummary(
  db: SupabaseClient,
  opts: { companyId?: string | null; days?: number; limit?: number },
): Promise<AnalyticsEventsSummary> {
  const days = Math.min(30, Math.max(1, opts.days ?? 14));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  let query = db
    .from("analytics_events")
    .select("event_type, channel, success, token_cost, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 2000);

  if (opts.companyId) query = query.eq("company_id", opts.companyId);

  const { data, error } = await query;
  if (error) {
    console.warn("[analytics_events] summary", error.message);
    return summarizeAnalyticsEvents([]);
  }
  return summarizeAnalyticsEvents((data ?? []) as AnalyticsEventRow[]);
}
