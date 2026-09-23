import { brandKitPrompt } from "@/lib/branding";
import { isSocialCampaignChannel } from "@/lib/campaignChannels";
import { ensureAnalyticsSocialSchema } from "@/lib/ensureAnalyticsSocialSchema";
import { dispatchSocialCampaign } from "@/lib/social/dispatchSocialCampaign";
import type { AgentToolDefinition } from "@/lib/agent/types";

export const dispatchSocialCampaignTool: AgentToolDefinition = {
  name: "dispatchSocialCampaign",
  description:
    "Create Variant A/B social copy for Facebook, Instagram, or LinkedIn, attach an optional poster/media URL from Supabase Storage, and queue (or publish) via Meta Graph / LinkedIn. Dry-run publish unless confirmPost=true.",
  tasks: ["campaign_strategy", "site_workflow", "general"],
  parameters: {
    type: "object",
    properties: {
      channel: {
        type: "string",
        enum: ["facebook", "instagram", "linkedin"],
        description: "Social network to post on.",
      },
      goal: {
        type: "string",
        description: "Campaign goal / message intent.",
      },
      audience: {
        type: "string",
        description: "Audience description.",
      },
      offer: {
        type: "string",
        description: "Soft CTA / offer hint.",
      },
      mediaUrl: {
        type: "string",
        description:
          "Public HTTPS URL of an AI poster or image (e.g. Supabase Storage public URL).",
      },
      mediaPath: {
        type: "string",
        description: "Optional storage path for audit trail.",
      },
      campaignId: {
        type: "string",
        description: "Optional Hub campaigns.id to link posts.",
      },
      mode: {
        type: "string",
        enum: ["draft", "queue", "publish"],
        description:
          "draft = save only; queue = enqueue for cron; publish = enqueue and attempt now (needs confirmPost).",
      },
      confirmPost: {
        type: "boolean",
        description:
          "Required true with mode=publish to call Meta/LinkedIn. Default false.",
      },
    },
    required: ["channel", "goal"],
    additionalProperties: false,
  },
  execute: async (args, ctx) => {
    const channelRaw =
      typeof args.channel === "string" ? args.channel.trim().toLowerCase() : "";
    if (!isSocialCampaignChannel(channelRaw)) {
      throw new Error("channel must be facebook, instagram, or linkedin");
    }
    const goal = typeof args.goal === "string" ? args.goal.trim() : "";
    if (!goal) throw new Error("goal is required");

    await ensureAnalyticsSocialSchema().catch(() => null);

    const brandPrompt = brandKitPrompt(ctx.companyName, ctx.brand, "copy");
    const result = await dispatchSocialCampaign(ctx.supabase, {
      clientId: ctx.clientId,
      channel: channelRaw,
      goal,
      audience:
        typeof args.audience === "string" ? args.audience.trim() : undefined,
      offer: typeof args.offer === "string" ? args.offer.trim() : undefined,
      brandPrompt,
      campaignId:
        typeof args.campaignId === "string" ? args.campaignId.trim() : null,
      mediaUrl:
        typeof args.mediaUrl === "string" ? args.mediaUrl.trim() : null,
      mediaPath:
        typeof args.mediaPath === "string" ? args.mediaPath.trim() : null,
      mode:
        args.mode === "draft" || args.mode === "queue" || args.mode === "publish"
          ? args.mode
          : "queue",
      confirmPost: args.confirmPost === true,
    });

    return {
      tool: "dispatchSocialCampaign",
      companyId: ctx.clientId,
      companyName: ctx.companyName,
      ...result,
      nextStep:
        "dryRun" in result && result.dryRun
          ? "Re-call with mode=publish and confirmPost=true when ready."
          : "Queued posts process via /api/cron/social-dispatch (or immediate publish results above).",
    };
  },
};
