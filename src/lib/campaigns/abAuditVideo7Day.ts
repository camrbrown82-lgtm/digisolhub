import type { SupabaseClient } from "@supabase/supabase-js";
import { logAnalyticsEvent } from "@/lib/analyticsEvents";
import { ensureAnalyticsSocialSchema } from "@/lib/ensureAnalyticsSocialSchema";
import {
  WEBSITE_AUDIT_PAGE_URL,
  WEBSITE_AUDIT_VIDEO_PATH,
  WEBSITE_AUDIT_VIDEO_URL,
} from "@/lib/media";
import { DIGISOL_SITE_URL } from "@/lib/site";
import { ensureDigisolClient } from "@/lib/workspace";

export const AB_AUDIT_VIDEO_CAMPAIGN_KEY = "ab_audit_video_7d_v1";
export const AB_AUDIT_VIDEO_CAMPAIGN_NAME =
  "Alberta FB Groups — Website Audit Video (7-day / 5 variants)";

export type AuditVideoVariant = {
  id: "1" | "2" | "3" | "4" | "5";
  label: string;
  hook: string;
  /** Day offset from campaign start (0 = day 1, … up to 6 for a 7-day window) */
  dayOffset: number;
  captionTemplate: string;
};

/**
 * Fixed copy pack for DigiSol's Alberta Facebook Group campaign.
 * [Link] is replaced with a UTM-tagged homepage CTA (Kaylev lives there).
 */
export const AB_AUDIT_VIDEO_VARIANTS: AuditVideoVariant[] = [
  {
    id: "1",
    label: "Direct Value Hook",
    hook: "losing local traffic",
    dayOffset: 0,
    captionTemplate:
      "Most Alberta small business websites are losing local traffic right here. 🛠️ I just ran a full teardown audit on local sites to show you exactly where the leaks are. Watch how we fix it—and grab one of our first 100 free comprehensive audits at the link below: [Link]",
  },
  {
    id: "2",
    label: "Competitive / Growth Hook",
    hook: "competitor traffic",
    dayOffset: 1,
    captionTemplate:
      "Is your local competitor getting all the digital traffic in your area? It usually comes down to 3 hidden web performance mistakes. 📈 Check out this quick breakdown video, and claim your free DigiSol site audit (First 100 users): [Link]",
  },
  {
    id: "3",
    label: "Startup / Scaling Hook",
    hook: "startup founders",
    dayOffset: 3,
    captionTemplate:
      "Building a startup in Alberta is hard enough without a sluggish, unoptimized web presence. 🚀 Here is a quick look at how we audit and bulletproof local sites for rapid growth. Free full audits available now for the first 100 founders: [Link]",
  },
  {
    id: "4",
    label: "Problem / Solution Hook",
    hook: "social views, zero conversions",
    dayOffset: 5,
    captionTemplate:
      "Are you getting views on your social channels but zero actual conversions on your website? 🛑 Let’s look under the hood. Watch how a proper technical and local SEO audit changes everything. Claim your free audit here: [Link]",
  },
  {
    id: "5",
    label: "Urgency Hook",
    hook: "stop guessing",
    dayOffset: 6,
    captionTemplate:
      "Quick audit breakdown for Alberta business owners. ⏱️ Stop guessing why your site isn't ranking or capturing leads. Watch the walkthrough, then head over to claim your free comprehensive site audit (limited to our first 100 users): [Link]",
  },
];

export function ctaLinkForVariant(variantId: string) {
  const params = new URLSearchParams({
    utm_source: "facebook",
    utm_medium: "group",
    utm_campaign: AB_AUDIT_VIDEO_CAMPAIGN_KEY,
    utm_content: `v${variantId}`,
  });
  return `${DIGISOL_SITE_URL}/?${params.toString()}`;
}

export function captionForVariant(variant: AuditVideoVariant) {
  const link = ctaLinkForVariant(variant.id);
  return variant.captionTemplate.replaceAll("[Link]", link);
}

/** ~10:00 America/Edmonton pacing (16:00 UTC ≈ MDT). */
export function scheduleAtMountain(dayOffset: number, from = new Date()) {
  const target = new Date(from);
  target.setUTCDate(target.getUTCDate() + dayOffset);
  target.setUTCHours(16, 0, 0, 0);
  return target;
}

export type StartedAuditVideoCampaign = {
  campaignId: string;
  alreadyRunning: boolean;
  clientId: string;
  videoUrl: string;
  mediaPageUrl: string;
  posts: Array<{
    id: string;
    variant: string;
    label: string;
    scheduledAt: string;
    status: string;
    body: string;
    ctaLink: string;
  }>;
  note: string;
};

/**
 * Create (or return) the DigiSol 7-day Facebook Group video campaign + 5 queued posts.
 * Posts are manual_facebook_group — copy into Groups; Meta Page API cannot target arbitrary groups.
 */
async function withSchemaTimeout<T>(
  promise: Promise<T>,
  ms = 4000,
): Promise<T | null> {
  return Promise.race([
    promise.catch(() => null),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

async function insertQueuedPosts(
  db: SupabaseClient,
  clientId: string,
  campaignId: string,
) {
  const rows = AB_AUDIT_VIDEO_VARIANTS.map((variant) => {
    const scheduled = scheduleAtMountain(variant.dayOffset);
    const body = captionForVariant(variant);
    return {
      client_id: clientId,
      campaign_id: campaignId,
      channel: "facebook" as const,
      variant: variant.id,
      body,
      media_url: WEBSITE_AUDIT_VIDEO_URL,
      media_path: WEBSITE_AUDIT_VIDEO_PATH,
      status: "queued" as const,
      token_cost: 0,
      scheduled_at: scheduled.toISOString(),
      metadata: {
        campaignKey: AB_AUDIT_VIDEO_CAMPAIGN_KEY,
        label: variant.label,
        hook: variant.hook,
        dayOffset: variant.dayOffset,
        ctaLink: ctaLinkForVariant(variant.id),
        publishMode: "manual_facebook_group",
        videoUrl: WEBSITE_AUDIT_VIDEO_URL,
        mediaPageUrl: WEBSITE_AUDIT_PAGE_URL,
        kaylevHandoff: true,
      },
    };
  });

  let { data: inserted, error: postErr } = await db
    .from("social_posts")
    .insert(rows)
    .select("id, variant, status, scheduled_at, body, metadata");

  if (postErr) {
    await withSchemaTimeout(ensureAnalyticsSocialSchema({ force: true }));
    const retry = await db
      .from("social_posts")
      .insert(rows)
      .select("id, variant, status, scheduled_at, body, metadata");
    inserted = retry.data;
    postErr = retry.error;
  }

  if (postErr) throw new Error(postErr.message);

  await logAnalyticsEvent(db, {
    companyId: clientId,
    eventType: "social_post_queued",
    channel: "facebook",
    success: true,
    campaignId,
    source: "ab_audit_video_7d",
    metadata: {
      campaignKey: AB_AUDIT_VIDEO_CAMPAIGN_KEY,
      variants: AB_AUDIT_VIDEO_VARIANTS.length,
      videoUrl: WEBSITE_AUDIT_VIDEO_URL,
    },
  });

  return (inserted ?? []).map((row) => {
    const meta = (row.metadata || {}) as Record<string, unknown>;
    const def = AB_AUDIT_VIDEO_VARIANTS.find((v) => v.id === row.variant);
    return {
      id: row.id as string,
      variant: String(row.variant),
      label: String(meta.label || def?.label || `Variant ${row.variant}`),
      scheduledAt: String(row.scheduled_at),
      status: String(row.status),
      body: String(row.body),
      ctaLink: String(meta.ctaLink || ctaLinkForVariant(String(row.variant))),
    };
  });
}

export async function startAbAuditVideoCampaign(
  db: SupabaseClient,
): Promise<StartedAuditVideoCampaign> {
  // Social schedule only needs core campaigns columns — skip A/B fields that
  // trip PostgREST schema cache when ab_split / industry / notes are missing.
  await withSchemaTimeout(ensureAnalyticsSocialSchema({ force: true }));

  const clientId = await ensureDigisolClient(db);
  if (!clientId) throw new Error("DigiSol client missing");

  const existing = await findAuditVideoCampaign(db, clientId);

  if (existing?.id) {
    const posts = await loadCampaignPosts(db, existing.id);
    if (posts.length > 0) {
      return {
        campaignId: existing.id,
        alreadyRunning: true,
        clientId,
        videoUrl: WEBSITE_AUDIT_VIDEO_URL,
        mediaPageUrl: WEBSITE_AUDIT_PAGE_URL,
        posts,
        note: "Campaign already initialized — monitoring existing schedule.",
      };
    }
    // Campaign row exists but posts never landed (prior schema failure) — finish it.
    const repaired = await insertQueuedPosts(db, clientId, existing.id);
    return {
      campaignId: existing.id,
      alreadyRunning: false,
      clientId,
      videoUrl: WEBSITE_AUDIT_VIDEO_URL,
      mediaPageUrl: WEBSITE_AUDIT_PAGE_URL,
      posts: repaired,
      note:
        "Campaign schedule repaired. Post each caption + video into Alberta Facebook Groups on the scheduled day, then mark as posted in Hub.",
    };
  }

  const startsAt = scheduleAtMountain(0);
  const endsAt = scheduleAtMountain(6);
  endsAt.setUTCHours(endsAt.getUTCHours() + 14);

  const segment = {
    key: AB_AUDIT_VIDEO_CAMPAIGN_KEY,
    channel: "facebook",
    target: "facebook_groups",
    audience:
      "Alberta startup founders, small business owners, entrepreneurs (Calgary, Edmonton, Airdrie, Red Deer groups)",
    durationDays: 7,
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    videoUrl: WEBSITE_AUDIT_VIDEO_URL,
    mediaPageUrl: WEBSITE_AUDIT_PAGE_URL,
    goal: "Distribute website audit video → free audit leads (first 100)",
    industry: "Alberta SMB / startups",
    cta:
      "Visit the site for a free website audit (Limited to the first 100 users).",
    kaylevHandoff: true,
    publishMode: "manual_facebook_group",
  };

  // Core columns only (name/status/client_id/segment) — always present.
  const { data: campaign, error: campErr } = await db
    .from("campaigns")
    .insert({
      name: AB_AUDIT_VIDEO_CAMPAIGN_NAME,
      status: "scheduled",
      client_id: clientId,
      segment,
    })
    .select("id")
    .single();

  if (campErr || !campaign) {
    throw new Error(campErr?.message || "Could not create campaign");
  }

  const posts = await insertQueuedPosts(db, clientId, campaign.id);

  return {
    campaignId: campaign.id,
    alreadyRunning: false,
    clientId,
    videoUrl: WEBSITE_AUDIT_VIDEO_URL,
    mediaPageUrl: WEBSITE_AUDIT_PAGE_URL,
    posts,
    note:
      "Campaign saved. Post each caption + video into Alberta Facebook Groups on the scheduled day, then mark as posted in Hub. Auto Graph posting to private Groups is not available — Page API only.",
  };
}

async function findAuditVideoCampaign(db: SupabaseClient, clientId: string) {
  const bySegment = await db
    .from("campaigns")
    .select("id, status, created_at")
    .eq("client_id", clientId)
    .contains("segment", { key: AB_AUDIT_VIDEO_CAMPAIGN_KEY })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (bySegment.data?.id) return bySegment.data;

  // Fallback if jsonb contains is flaky — match by campaign name.
  const byName = await db
    .from("campaigns")
    .select("id, status, created_at")
    .eq("client_id", clientId)
    .eq("name", AB_AUDIT_VIDEO_CAMPAIGN_NAME)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return byName.data;
}

async function loadCampaignPosts(db: SupabaseClient, campaignId: string) {
  const { data } = await db
    .from("social_posts")
    .select("id, variant, status, scheduled_at, body, metadata")
    .eq("campaign_id", campaignId)
    .order("scheduled_at", { ascending: true });

  return (data ?? []).map((row) => {
    const meta = (row.metadata || {}) as Record<string, unknown>;
    const def = AB_AUDIT_VIDEO_VARIANTS.find((v) => v.id === row.variant);
    return {
      id: row.id as string,
      variant: String(row.variant),
      label: String(meta.label || def?.label || `Variant ${row.variant}`),
      scheduledAt: String(row.scheduled_at || ""),
      status: String(row.status),
      body: String(row.body),
      ctaLink: String(meta.ctaLink || ctaLinkForVariant(String(row.variant))),
    };
  });
}

export async function getAbAuditVideoCampaignStatus(db: SupabaseClient) {
  const clientId = await ensureDigisolClient(db);
  if (!clientId) return null;

  const found = await findAuditVideoCampaign(db, clientId);
  if (!found?.id) return null;

  const { data: campaign } = await db
    .from("campaigns")
    .select("id, name, status, segment, created_at")
    .eq("id", found.id)
    .maybeSingle();

  if (!campaign) return null;

  const posts = await loadCampaignPosts(db, campaign.id);
  const published = posts.filter((p) => p.status === "published").length;
  const queued = posts.filter((p) => p.status === "queued" || p.status === "draft").length;
  const failed = posts.filter((p) => p.status === "failed").length;

  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const { data: events } = await db
    .from("analytics_events")
    .select("event_type, success, created_at, metadata")
    .eq("company_id", clientId)
    .gte("created_at", since)
    .in("event_type", [
      "visitor_chat_lead",
      "website_audit_run",
      "social_post_published",
      "social_post_queued",
    ])
    .order("created_at", { ascending: false })
    .limit(100);

  return {
    campaign,
    posts,
    stats: { published, queued, failed, total: posts.length },
    recentEvents: events ?? [],
    videoUrl: WEBSITE_AUDIT_VIDEO_URL,
    mediaPageUrl: WEBSITE_AUDIT_PAGE_URL,
  };
}

export async function markAbAuditVideoPostPublished(
  db: SupabaseClient,
  postId: string,
) {
  const { data, error } = await db
    .from("social_posts")
    .update({
      status: "published",
      published_at: new Date().toISOString(),
      error_message: null,
    })
    .eq("id", postId)
    .select("id, client_id, campaign_id, channel, variant, token_cost, metadata")
    .single();

  if (error || !data) throw new Error(error?.message || "Post not found");

  await logAnalyticsEvent(db, {
    companyId: data.client_id,
    eventType: "social_post_published",
    channel: "facebook",
    success: true,
    campaignId: data.campaign_id,
    source: "manual_facebook_group",
    metadata: {
      postId: data.id,
      variant: data.variant,
      publishMode: "manual_facebook_group",
    },
  });

  return data;
}
