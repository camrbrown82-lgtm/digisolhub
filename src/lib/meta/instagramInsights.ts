import {
  metaAccessToken,
  metaGraphVersion,
} from "@/lib/meta/config";

export type InstagramInsightMetric = {
  name: string;
  title: string;
  value: number;
  period: string;
};

export type InstagramInsightsSummary = {
  configured: boolean;
  synced: boolean;
  error?: string;
  username?: string | null;
  followers?: number | null;
  mediaCount?: number | null;
  metrics: InstagramInsightMetric[];
};

function igUserId() {
  return process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID?.trim() || "";
}

export function instagramInsightsConfigured() {
  return Boolean(igUserId() && metaAccessToken());
}

export function emptyInstagramInsights(): InstagramInsightsSummary {
  return {
    configured: instagramInsightsConfigured(),
    synced: false,
    metrics: [],
  };
}

function num(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Organic Instagram Insights for the linked Business account.
 * Requires INSTAGRAM_BUSINESS_ACCOUNT_ID + page/system token with instagram_basic
 * + instagram_manage_insights.
 */
export async function fetchInstagramInsights(): Promise<InstagramInsightsSummary> {
  const summary = emptyInstagramInsights();
  if (!instagramInsightsConfigured()) {
    summary.error =
      "Set INSTAGRAM_BUSINESS_ACCOUNT_ID and META_PAGE_ACCESS_TOKEN (or META_CAPI_ACCESS_TOKEN) with Instagram insights permission.";
    return summary;
  }

  const id = igUserId();
  const token = metaAccessToken();
  const version = metaGraphVersion();

  try {
    const profileUrl = new URL(
      `https://graph.facebook.com/${version}/${id}`,
    );
    profileUrl.searchParams.set(
      "fields",
      "username,followers_count,media_count,name",
    );
    profileUrl.searchParams.set("access_token", token);

    const profileRes = await fetch(profileUrl.toString());
    const profile = (await profileRes.json()) as {
      username?: string;
      followers_count?: number;
      media_count?: number;
      error?: { message?: string };
    };
    if (!profileRes.ok || profile.error) {
      summary.error =
        profile.error?.message || `Instagram profile HTTP ${profileRes.status}`;
      return summary;
    }

    summary.username = profile.username || null;
    summary.followers = profile.followers_count ?? null;
    summary.mediaCount = profile.media_count ?? null;

    // Account insights (IG professional accounts). Some metrics need days/period.
    const metrics = [
      "reach",
      "follower_count",
      "profile_views",
      "website_clicks",
      "accounts_engaged",
    ];
    const insightsUrl = new URL(
      `https://graph.facebook.com/${version}/${id}/insights`,
    );
    insightsUrl.searchParams.set("metric", metrics.join(","));
    insightsUrl.searchParams.set("period", "day");
    insightsUrl.searchParams.set("metric_type", "total_value");
    insightsUrl.searchParams.set("access_token", token);

    const insightsRes = await fetch(insightsUrl.toString());
    const insights = (await insightsRes.json()) as {
      data?: Array<{
        name?: string;
        title?: string;
        period?: string;
        total_value?: { value?: number };
        values?: Array<{ value?: number }>;
      }>;
      error?: { message?: string };
    };

    if (!insightsRes.ok || insights.error) {
      // Profile still useful even if insights permission is missing.
      summary.synced = true;
      summary.error =
        insights.error?.message ||
        `Instagram insights HTTP ${insightsRes.status}`;
      return summary;
    }

    summary.metrics = (insights.data || []).map((row) => {
      const fromTotal = row.total_value?.value;
      const fromValues = row.values?.[row.values.length - 1]?.value;
      return {
        name: String(row.name || ""),
        title: String(row.title || row.name || "Metric"),
        value: num(fromTotal ?? fromValues),
        period: String(row.period || "day"),
      };
    });
    summary.synced = true;
    return summary;
  } catch (error) {
    summary.error =
      error instanceof Error ? error.message : "Instagram Insights failed";
    return summary;
  }
}
