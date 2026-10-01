import type { SupabaseClient } from "@supabase/supabase-js";
import { DRAFT_COLUMNS } from "@/lib/meta/adDrafts";
import { createPausedCampaign, metaErrorMessage, setCampaignLive, type AdDraft } from "@/lib/meta/ads";
import { metaPixelId } from "@/lib/meta/config";
import { dailyFromWeekly, nextPostInstant, type PlanAd, type PlanItem, type PlanPost, type SocialPlan } from "@/lib/social/weekPlan";

const PLAN_COLUMNS =
  "id, client_id, status, brief, weekly_budget, summary, why, items, ad_draft_id, error, created_at, approved_at";

export async function loadPlan(db: SupabaseClient, id: string, clientId: string) {
  const { data } = await db.from("social_plans").select(PLAN_COLUMNS).eq("id", id).eq("client_id", clientId).maybeSingle();
  if (!data) return null;
  return { ...(data as SocialPlan), items: (data.items ?? []) as PlanItem[] };
}

/**
 * Queues the approved posts for the social cron and starts the ad, still inside the daily cap.
 * A failed ad does not un-queue posts that were already accepted.
 */
export async function runApprovedPlan(
  db: SupabaseClient,
  plan: SocialPlan & { client_id: string },
  maxDaily: number,
) {
  const items = plan.items.map((item) => ({ ...item }));
  const errors: string[] = [];
  let adDraftId: string | null = null;

  for (const item of items) {
    if (!item.included) {
      item.status = "skipped";
      continue;
    }
    if (item.kind === "post") {
      const queued = await queuePost(db, plan.client_id, plan.id, item);
      if (queued.error) {
        item.status = "failed";
        item.error = queued.error;
        errors.push(queued.error);
      } else {
        item.status = "queued";
        item.socialPostId = queued.id;
      }
    }
  }

  const ad = items.find((item): item is PlanAd => item.kind === "ad" && item.included);
  if (ad) {
    const daily = dailyFromWeekly(Number(plan.weekly_budget), maxDaily);
    try {
      if (!metaPixelId() && ad.objective === "OUTCOME_LEADS") ad.objective = "OUTCOME_TRAFFIC";
      const created = await launchAd(db, plan.client_id, ad, daily);
      ad.status = "live";
      adDraftId = created.draftId;
    } catch (error) {
      ad.status = "failed";
      ad.error = metaErrorMessage(error);
      errors.push(ad.error);
    }
  }

  const now = new Date().toISOString();
  const { data } = await db
    .from("social_plans")
    .update({
      status: "running",
      items,
      ad_draft_id: adDraftId,
      error: errors[0] || null,
      approved_at: now,
      updated_at: now,
    })
    .eq("id", plan.id)
    .select(PLAN_COLUMNS)
    .single();
  return (data ?? { ...plan, status: "running", items, error: errors[0] || null }) as SocialPlan;
}

async function queuePost(db: SupabaseClient, clientId: string, planId: string, post: PlanPost) {
  if (post.channel === "instagram" && !post.posterUrl) {
    return { error: "Instagram needs a poster." };
  }
  const { data, error } = await db
    .from("social_posts")
    .insert({
      client_id: clientId,
      channel: post.channel,
      variant: "A",
      body: post.body,
      media_url: post.posterUrl || null,
      status: "queued",
      scheduled_at: nextPostInstant(post.dayOffset, post.hour).toISOString(),
      metadata: { planId, reason: post.reason, source: "week-plan" },
    })
    .select("id")
    .single();
  if (error) return { error: error.message };
  return { id: data.id as string };
}

async function launchAd(db: SupabaseClient, clientId: string, ad: PlanAd, daily: number) {
  if (!ad.posterUrl) throw new Error("The ad needs a poster.");
  if (!(daily > 0)) throw new Error("Set a weekly budget above zero to run ads.");
  const { data: draft, error } = await db
    .from("meta_ad_drafts")
    .insert({
      client_id: clientId,
      status: "draft",
      brief: ad.reason,
      name: ad.name,
      objective: ad.objective,
      daily_budget: daily,
      headline: ad.headline,
      primary_text: ad.primaryText,
      description: ad.description,
      cta: ad.cta,
      link_url: ad.linkUrl,
      poster_url: ad.posterUrl,
      locations: ad.locations,
      age_min: Math.min(ad.ageMin, ad.ageMax),
      age_max: Math.max(ad.ageMin, ad.ageMax),
    })
    .select(DRAFT_COLUMNS)
    .single();
  if (error || !draft) throw new Error(error?.message || "Could not save the ad.");
  const row = draft as unknown as AdDraft;
  const created = await createPausedCampaign({ ...row, daily_budget: daily });
  await db
    .from("meta_ad_drafts")
    .update({
      status: "ready",
      meta_campaign_id: created.campaignId,
      meta_adset_id: created.adsetId,
      meta_creative_id: created.creativeId,
      meta_ad_id: created.adId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id);
  await setCampaignLive(
    {
      ...row,
      daily_budget: daily,
      meta_campaign_id: created.campaignId,
      meta_adset_id: created.adsetId,
      meta_creative_id: created.creativeId,
      meta_ad_id: created.adId,
    },
    true,
  );
  await db
    .from("meta_ad_drafts")
    .update({ status: "active", launched_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", row.id);
  return { draftId: row.id };
}
