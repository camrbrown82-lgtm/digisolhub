import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import {
  metaAccessToken,
  metaAdAccountId,
  metaAdsInsightsConfigured,
  metaGraphVersion,
} from "@/lib/meta/config";
import { ensureMetaSchema } from "@/lib/ensureMetaSchema";

export type MetaCampaignInsight = {
  campaignId: string;
  campaignName: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  leads: number;
  cpl: number | null;
  dateStart: string;
  dateStop: string;
};

export type MetaAdsSummary = {
  configured: boolean;
  synced: boolean;
  error?: string;
  days: number;
  spend: number;
  impressions: number;
  clicks: number;
  leads: number;
  cpl: number | null;
  campaigns: MetaCampaignInsight[];
};

function num(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function actionCount(
  actions: Array<{ action_type?: string; value?: string }> | undefined,
  types: string[],
) {
  if (!actions?.length) return 0;
  return actions
    .filter((row) => types.includes(String(row.action_type || "")))
    .reduce((sum, row) => sum + num(row.value), 0);
}

export function emptyMetaAdsSummary(days = 14): MetaAdsSummary {
  return {
    configured: metaAdsInsightsConfigured(),
    synced: false,
    days,
    spend: 0,
    impressions: 0,
    clicks: 0,
    leads: 0,
    cpl: null,
    campaigns: [],
  };
}

/**
 * Pull campaign-level Insights for the last N days and upsert into meta_ads_insights.
 */
export async function syncMetaAdsInsights(days = 14): Promise<MetaAdsSummary> {
  const summary = emptyMetaAdsSummary(days);
  if (!metaAdsInsightsConfigured()) {
    summary.error =
      "Set META_AD_ACCOUNT_ID and META_CAPI_ACCESS_TOKEN (or META_PAGE_ACCESS_TOKEN with ads_read).";
    return summary;
  }

  await ensureMetaSchema().catch(() => null);

  const accountId = metaAdAccountId();
  const token = metaAccessToken();
  const fields = [
    "campaign_id",
    "campaign_name",
    "spend",
    "impressions",
    "clicks",
    "ctr",
    "cpc",
    "actions",
    "date_start",
    "date_stop",
  ].join(",");

  const url = new URL(
    `https://graph.facebook.com/${metaGraphVersion()}/${accountId}/insights`,
  );
  url.searchParams.set("level", "campaign");
  url.searchParams.set("date_preset", days <= 7 ? "last_7d" : "last_14d");
  url.searchParams.set("fields", fields);
  url.searchParams.set("limit", "100");
  url.searchParams.set("access_token", token);

  try {
    const response = await fetch(url.toString(), { method: "GET" });
    const raw = (await response.json()) as {
      data?: Array<Record<string, unknown>>;
      error?: { message?: string };
    };
    if (!response.ok || raw.error) {
      summary.error = raw.error?.message || `Meta Insights HTTP ${response.status}`;
      return summary;
    }

    const rows = raw.data ?? [];
    const campaigns: MetaCampaignInsight[] = rows.map((row) => {
      const spend = num(row.spend);
      const impressions = num(row.impressions);
      const clicks = num(row.clicks);
      const leads = actionCount(
        row.actions as Array<{ action_type?: string; value?: string }> | undefined,
        [
          "lead",
          "onsite_conversion.lead",
          "offsite_conversion.fb_pixel_lead",
          "leadgen_grouped",
        ],
      );
      return {
        campaignId: String(row.campaign_id || ""),
        campaignName: String(row.campaign_name || "Campaign"),
        spend,
        impressions,
        clicks,
        ctr: num(row.ctr),
        cpc: num(row.cpc),
        leads,
        cpl: leads > 0 ? spend / leads : null,
        dateStart: String(row.date_start || ""),
        dateStop: String(row.date_stop || ""),
      };
    });

    summary.campaigns = campaigns.sort((a, b) => b.spend - a.spend);
    summary.spend = campaigns.reduce((s, c) => s + c.spend, 0);
    summary.impressions = campaigns.reduce((s, c) => s + c.impressions, 0);
    summary.clicks = campaigns.reduce((s, c) => s + c.clicks, 0);
    summary.leads = campaigns.reduce((s, c) => s + c.leads, 0);
    summary.cpl = summary.leads > 0 ? summary.spend / summary.leads : null;
    summary.synced = true;

    if (hasAdminClient()) {
      const admin = createAdminClient();
      const now = new Date().toISOString();
      for (const campaign of campaigns) {
        await admin.from("meta_ads_insights").upsert(
          {
            ad_account_id: accountId,
            campaign_id: campaign.campaignId || "unknown",
            campaign_name: campaign.campaignName,
            date_start: campaign.dateStart || null,
            date_stop: campaign.dateStop || null,
            spend: campaign.spend,
            impressions: campaign.impressions,
            clicks: campaign.clicks,
            ctr: campaign.ctr,
            cpc: campaign.cpc,
            leads: campaign.leads,
            payload: campaign,
            synced_at: now,
          },
          { onConflict: "ad_account_id,campaign_id,date_start,date_stop" },
        );
      }
    }

    return summary;
  } catch (error) {
    summary.error =
      error instanceof Error ? error.message : "Meta Insights sync failed";
    return summary;
  }
}

/** Read latest cached insights when live sync is unavailable. */
export async function loadCachedMetaAdsSummary(days = 14): Promise<MetaAdsSummary> {
  const summary = emptyMetaAdsSummary(days);
  if (!hasAdminClient()) return summary;
  await ensureMetaSchema().catch(() => null);

  try {
    const admin = createAdminClient();
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await admin
      .from("meta_ads_insights")
      .select(
        "campaign_id, campaign_name, spend, impressions, clicks, ctr, cpc, leads, date_start, date_stop, synced_at",
      )
      .gte("synced_at", since)
      .order("spend", { ascending: false })
      .limit(50);

    if (error || !data?.length) {
      summary.configured = metaAdsInsightsConfigured();
      return summary;
    }

    const campaigns: MetaCampaignInsight[] = data.map((row) => ({
      campaignId: row.campaign_id,
      campaignName: row.campaign_name || "Campaign",
      spend: num(row.spend),
      impressions: num(row.impressions),
      clicks: num(row.clicks),
      ctr: num(row.ctr),
      cpc: num(row.cpc),
      leads: num(row.leads),
      cpl: num(row.leads) > 0 ? num(row.spend) / num(row.leads) : null,
      dateStart: row.date_start || "",
      dateStop: row.date_stop || "",
    }));

    summary.configured = true;
    summary.synced = true;
    summary.campaigns = campaigns;
    summary.spend = campaigns.reduce((s, c) => s + c.spend, 0);
    summary.impressions = campaigns.reduce((s, c) => s + c.impressions, 0);
    summary.clicks = campaigns.reduce((s, c) => s + c.clicks, 0);
    summary.leads = campaigns.reduce((s, c) => s + c.leads, 0);
    summary.cpl = summary.leads > 0 ? summary.spend / summary.leads : null;
    return summary;
  } catch {
    return summary;
  }
}

export async function fetchMetaAdsSummary(days = 14): Promise<MetaAdsSummary> {
  const live = await syncMetaAdsInsights(days);
  if (live.synced || !live.error) return live;
  const cached = await loadCachedMetaAdsSummary(days);
  if (cached.synced) {
    return { ...cached, error: live.error };
  }
  return live;
}
