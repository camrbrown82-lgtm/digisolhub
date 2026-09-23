import type { SupabaseClient } from "@supabase/supabase-js";
import { logAnalyticsEvent } from "@/lib/analyticsEvents";
import {
  isSocialCampaignChannel,
  type SocialCampaignChannel,
} from "@/lib/campaignChannels";
import {
  BRAND_COPY_TEMPERATURE,
  createOpenAIClient,
  getOpenAIApiKey,
} from "@/lib/openai";
import { routeAgentModel } from "@/lib/agent/modelRouter";
import {
  publishSocialPost,
  socialProviderConfigured,
} from "@/lib/social/providers";

export type SocialAbCopy = {
  bodyA: string;
  bodyB: string;
  hypothesis: string;
  tokenCost: number;
};

export type DispatchSocialCampaignInput = {
  clientId: string;
  channel: SocialCampaignChannel;
  goal: string;
  audience?: string;
  offer?: string;
  brandPrompt?: string;
  campaignId?: string | null;
  mediaUrl?: string | null;
  mediaPath?: string | null;
  /** draft = save only; queue = insert queued rows; publish = queue then attempt now */
  mode?: "draft" | "queue" | "publish";
  confirmPost?: boolean;
};

/**
 * Create Variant A/B social copy, attach optional media from Supabase Storage URL,
 * and enqueue (or immediately publish) via Meta Graph / LinkedIn.
 */
export async function dispatchSocialCampaign(
  db: SupabaseClient,
  input: DispatchSocialCampaignInput,
) {
  if (!isSocialCampaignChannel(input.channel)) {
    throw new Error(`Unsupported social channel: ${input.channel}`);
  }

  const mode = input.mode || "queue";
  const confirmPost = input.confirmPost === true;
  if (mode === "publish" && !confirmPost) {
    return {
      dryRun: true as const,
      channel: input.channel,
      providerReady: socialProviderConfigured(input.channel),
      message:
        "Dry run only. Re-call with mode=publish and confirmPost=true to enqueue + publish.",
    };
  }

  const ab = await draftSocialAbVariants({
    channel: input.channel,
    goal: input.goal,
    audience: input.audience,
    offer: input.offer,
    brandPrompt: input.brandPrompt,
  });

  const status =
    mode === "draft" ? "draft" : mode === "publish" ? "queued" : "queued";

  const rows = (
    [
      { variant: "A" as const, body: ab.bodyA },
      { variant: "B" as const, body: ab.bodyB },
    ] as const
  ).map((item) => ({
    client_id: input.clientId,
    campaign_id: input.campaignId || null,
    channel: input.channel,
    variant: item.variant,
    body: item.body,
    media_url: input.mediaUrl || null,
    media_path: input.mediaPath || null,
    status,
    token_cost: Math.ceil(ab.tokenCost / 2),
    scheduled_at: mode === "draft" ? null : new Date().toISOString(),
    metadata: {
      goal: input.goal,
      audience: input.audience || null,
      offer: input.offer || null,
      hypothesis: ab.hypothesis,
      mode,
    },
  }));

  const { data: inserted, error } = await db
    .from("social_posts")
    .insert(rows)
    .select("id, channel, variant, status, body, media_url");

  if (error) throw new Error(error.message);

  await logAnalyticsEvent(db, {
    companyId: input.clientId,
    eventType: "social_post_queued",
    channel: input.channel,
    success: true,
    tokenCost: ab.tokenCost,
    campaignId: input.campaignId,
    source: "dispatchSocialCampaign",
    metadata: {
      mode,
      variants: (inserted ?? []).map((row) => row.variant),
      postIds: (inserted ?? []).map((row) => row.id),
    },
  });

  let publishResults: Awaited<ReturnType<typeof processSocialPostQueue>> | null =
    null;
  if (mode === "publish" && confirmPost) {
    const ids = (inserted ?? []).map((row) => row.id as string);
    publishResults = await processSocialPostQueue(db, {
      clientId: input.clientId,
      limit: ids.length,
      onlyIds: ids,
    });
  }

  return {
    dryRun: false as const,
    channel: input.channel,
    hypothesis: ab.hypothesis,
    tokenCost: ab.tokenCost,
    providerReady: socialProviderConfigured(input.channel),
    posts: inserted ?? [],
    publishResults,
  };
}

export async function draftSocialAbVariants(input: {
  channel: SocialCampaignChannel;
  goal: string;
  audience?: string;
  offer?: string;
  brandPrompt?: string;
}): Promise<SocialAbCopy> {
  if (!getOpenAIApiKey()) {
    return {
      bodyA: fallbackBody(input.channel, input.goal, "A"),
      bodyB: fallbackBody(input.channel, input.goal, "B"),
      hypothesis: "Fallback copy — OPENAI_API_KEY missing.",
      tokenCost: 0,
    };
  }

  const openai = createOpenAIClient();
  const model = routeAgentModel("lightweight");
  const completion = await openai.chat.completions.create({
    model,
    temperature: BRAND_COPY_TEMPERATURE,
    max_tokens: 500,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You write short DigiSol social posts for ${input.channel}.
${input.brandPrompt ? `Brand kit:\n${input.brandPrompt}\n` : ""}
Return JSON only:
{
  "bodyA":"...",
  "bodyB":"...",
  "hypothesis":"one sentence on A vs B"
}
Rules: 1–3 short paragraphs or lines; no hashtag spam (max 3); no invented prices; soft CTA; platform-aware tone (${input.channel}).`,
      },
      {
        role: "user",
        content: `Goal: ${input.goal}
Audience: ${input.audience || "business owners"}
Offer / CTA: ${input.offer || "soft consult booking"}
Write two meaningfully different variants.`,
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw) as Partial<SocialAbCopy>;
  const tokenCost =
    (completion.usage?.prompt_tokens ?? 0) +
    (completion.usage?.completion_tokens ?? 0);

  return {
    bodyA: parsed.bodyA?.trim() || fallbackBody(input.channel, input.goal, "A"),
    bodyB: parsed.bodyB?.trim() || fallbackBody(input.channel, input.goal, "B"),
    hypothesis:
      parsed.hypothesis?.trim() ||
      "Variant B tests a sharper proof point vs Variant A's softer consult ask.",
    tokenCost,
  };
}

function fallbackBody(
  channel: SocialCampaignChannel,
  goal: string,
  variant: "A" | "B",
) {
  const angle =
    variant === "A"
      ? "Clear next step for your website and marketing."
      : "A small conversion fix can change how leads find you.";
  return `DigiSol · ${channel}\n\n${goal}\n\n${angle}\n\nWant a free site check? Reply or visit wwwdigisol.com`;
}

/**
 * Process queued social_posts (cron / manual). Publishes due rows via providers.
 */
export async function processSocialPostQueue(
  db: SupabaseClient,
  opts?: {
    clientId?: string;
    limit?: number;
    onlyIds?: string[];
  },
) {
  const limit = Math.min(20, Math.max(1, opts?.limit ?? 10));
  const now = new Date().toISOString();

  let query = db
    .from("social_posts")
    .select(
      "id, client_id, campaign_id, channel, variant, body, media_url, status, token_cost",
    )
    .eq("status", "queued")
    .order("scheduled_at", { ascending: true, nullsFirst: true })
    .order("created_at", { ascending: true })
    .limit(limit);

  if (opts?.clientId) query = query.eq("client_id", opts.clientId);
  if (opts?.onlyIds?.length) query = query.in("id", opts.onlyIds);
  else query = query.or(`scheduled_at.is.null,scheduled_at.lte.${now}`);

  const { data: rows, error } = await query;
  if (error) throw new Error(error.message);

  const results: Array<{
    id: string;
    channel: string;
    ok: boolean;
    skipped?: boolean;
    externalId?: string;
    error?: string;
  }> = [];

  for (const row of rows ?? []) {
    if (!isSocialCampaignChannel(row.channel)) {
      results.push({
        id: row.id,
        channel: row.channel,
        ok: false,
        error: "Invalid channel",
      });
      continue;
    }

    await db
      .from("social_posts")
      .update({ status: "publishing", error_message: null })
      .eq("id", row.id);

    const published = await publishSocialPost({
      channel: row.channel,
      body: row.body,
      mediaUrl: row.media_url,
    });

    if (published.ok) {
      await db
        .from("social_posts")
        .update({
          status: "published",
          external_id: published.externalId || null,
          external_url: published.externalUrl || null,
          published_at: new Date().toISOString(),
          error_message: null,
        })
        .eq("id", row.id);

      await logAnalyticsEvent(db, {
        companyId: row.client_id,
        eventType: "social_post_published",
        channel: row.channel,
        success: true,
        tokenCost: row.token_cost || 0,
        campaignId: row.campaign_id,
        source: "social-cron",
        metadata: {
          postId: row.id,
          variant: row.variant,
          externalId: published.externalId,
        },
      });

      results.push({
        id: row.id,
        channel: row.channel,
        ok: true,
        externalId: published.externalId,
      });
    } else {
      const status = published.skipped ? "queued" : "failed";
      await db
        .from("social_posts")
        .update({
          status,
          error_message: published.error || "Publish failed",
        })
        .eq("id", row.id);

      await logAnalyticsEvent(db, {
        companyId: row.client_id,
        eventType: "social_post_failed",
        channel: row.channel,
        success: false,
        tokenCost: row.token_cost || 0,
        campaignId: row.campaign_id,
        source: "social-cron",
        metadata: {
          postId: row.id,
          variant: row.variant,
          skipped: Boolean(published.skipped),
          error: published.error,
        },
      });

      results.push({
        id: row.id,
        channel: row.channel,
        ok: false,
        skipped: published.skipped,
        error: published.error,
      });
    }
  }

  return {
    checked: rows?.length ?? 0,
    results,
    published: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok && !r.skipped).length,
    skipped: results.filter((r) => r.skipped).length,
  };
}
