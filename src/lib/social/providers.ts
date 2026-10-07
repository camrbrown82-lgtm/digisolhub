import type { SocialCampaignChannel } from "@/lib/campaignChannels";
import { isWorkspaceMediaUrl, posterExportUrl } from "@/lib/posterSizes";
import { DIGISOL_SITE_URL, LINKEDIN_ENABLED } from "@/lib/site";

export type SocialPublishResult = {
  ok: boolean;
  externalId?: string;
  externalUrl?: string;
  error?: string;
  skipped?: boolean;
  provider: "meta" | "linkedin" | "none";
};

function metaPageId() {
  return process.env.META_PAGE_ID?.trim() || "";
}

function metaPageToken() {
  return (
    process.env.META_PAGE_ACCESS_TOKEN?.trim() ||
    process.env.FACEBOOK_PAGE_ACCESS_TOKEN?.trim() ||
    ""
  );
}

function linkedInToken() {
  return process.env.LINKEDIN_ACCESS_TOKEN?.trim() || "";
}

const SOCIAL_VIDEO = /\.(mp4|mov|m4v)$/i;

/** MP4, MOV, and M4V can publish as a Facebook video or an Instagram Reel. */
export function isSocialVideoUrl(url: string | null | undefined) {
  if (!url) return false;
  try {
    return SOCIAL_VIDEO.test(new URL(url).pathname);
  } catch {
    return SOCIAL_VIDEO.test(url.split("?")[0] || "");
  }
}

function linkedInAuthorUrn() {
  return (
    process.env.LINKEDIN_AUTHOR_URN?.trim() ||
    process.env.LINKEDIN_PERSON_URN?.trim() ||
    ""
  );
}

export function socialProviderConfigured(channel: SocialCampaignChannel) {
  if (channel === "linkedin") {
    return Boolean(LINKEDIN_ENABLED && linkedInToken() && linkedInAuthorUrn());
  }
  // Facebook + Instagram (Business) both post via Meta Graph page token
  return Boolean(metaPageId() && metaPageToken());
}

/**
 * Publish a social post via Meta Graph (Facebook / Instagram) or LinkedIn UGC.
 * When credentials are missing, returns skipped=true so the queue can stay draft/failed safely.
 */
export async function publishSocialPost(input: {
  channel: SocialCampaignChannel;
  body: string;
  mediaUrl?: string | null;
}): Promise<SocialPublishResult> {
  const body = input.body.trim();
  if (!body) {
    return {
      ok: false,
      provider: "none",
      error: "Post body is empty",
    };
  }

  // One JPEG for both feeds: 1080×1080. That ratio sits inside Instagram (4:5 through 1.91:1)
  // and Facebook's feed photo sizes. Instagram also rejects PNG. Videos stay as the uploaded file.
  const video = isSocialVideoUrl(input.mediaUrl);
  const mediaUrl =
    !video && isWorkspaceMediaUrl(input.mediaUrl)
      ? posterExportUrl(input.mediaUrl!, input.channel === "linkedin" ? "link" : "square", { base: DIGISOL_SITE_URL })
      : input.mediaUrl;

  if (input.channel === "linkedin") {
    if (!LINKEDIN_ENABLED) {
      return {
        ok: false,
        skipped: true,
        provider: "linkedin",
        error: "LinkedIn is paused until the DigiSol business page is set up.",
      };
    }
    return publishLinkedIn({ body, mediaUrl });
  }
  if (input.channel === "instagram") {
    return publishInstagram({ body, mediaUrl });
  }
  return publishFacebook({ body, mediaUrl });
}

async function publishFacebook(input: {
  body: string;
  mediaUrl?: string | null;
}): Promise<SocialPublishResult> {
  const pageId = metaPageId();
  const token = metaPageToken();
  if (!pageId || !token) {
    return {
      ok: false,
      skipped: true,
      provider: "meta",
      error:
        "META_PAGE_ID / META_PAGE_ACCESS_TOKEN not configured — post left for manual publish",
    };
  }

  const video = isSocialVideoUrl(input.mediaUrl);
  const endpoint = video
    ? `https://graph-video.facebook.com/v21.0/${pageId}/videos`
    : input.mediaUrl
      ? `https://graph.facebook.com/v21.0/${pageId}/photos`
      : `https://graph.facebook.com/v21.0/${pageId}/feed`;

  const params = new URLSearchParams(
    video
      ? {
          access_token: token,
          file_url: input.mediaUrl || "",
          description: input.body,
          published: "true",
        }
      : {
          access_token: token,
          message: input.body,
          ...(input.mediaUrl ? { url: input.mediaUrl, caption: input.body } : {}),
        },
  );

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    });
    const json = (await response.json()) as {
      id?: string;
      post_id?: string;
      error?: { message?: string };
    };
    if (!response.ok) {
      return {
        ok: false,
        provider: "meta",
        error: json.error?.message || `Meta Graph HTTP ${response.status}`,
      };
    }
    const externalId = json.post_id || json.id || "";
    return {
      ok: true,
      provider: "meta",
      externalId,
      externalUrl: externalId
        ? video
          ? `https://www.facebook.com/${pageId}/videos/${json.id || externalId}`
          : `https://www.facebook.com/${externalId}`
        : undefined,
    };
  } catch (err) {
    return {
      ok: false,
      provider: "meta",
      error: err instanceof Error ? err.message : "Meta publish failed",
    };
  }
}

async function publishInstagram(input: {
  body: string;
  mediaUrl?: string | null;
}): Promise<SocialPublishResult> {
  const igUserId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID?.trim() || "";
  const token = metaPageToken();
  if (!igUserId || !token) {
    return {
      ok: false,
      skipped: true,
      provider: "meta",
      error:
        "INSTAGRAM_BUSINESS_ACCOUNT_ID / META_PAGE_ACCESS_TOKEN not configured",
    };
  }
  if (!input.mediaUrl) {
    return {
      ok: false,
      provider: "meta",
      error: "Instagram needs a public image or video.",
    };
  }

  const video = isSocialVideoUrl(input.mediaUrl);
  try {
    const createParams = new URLSearchParams(
      video
        ? {
            access_token: token,
            media_type: "REELS",
            video_url: input.mediaUrl || "",
            caption: input.body,
            share_to_feed: "true",
          }
        : {
            access_token: token,
            image_url: input.mediaUrl || "",
            caption: input.body,
          },
    );
    const createRes = await fetch(
      `https://graph.facebook.com/v21.0/${igUserId}/media`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: createParams,
      },
    );
    const createJson = (await createRes.json()) as {
      id?: string;
      error?: { message?: string };
    };
    if (!createRes.ok || !createJson.id) {
      return {
        ok: false,
        provider: "meta",
        error: createJson.error?.message || "Instagram media container failed",
      };
    }

    const pending = await waitForInstagramMedia(createJson.id, token, video ? 150_000 : 40_000);
    if (pending) {
      return { ok: false, provider: "meta", error: pending };
    }

    const publishParams = new URLSearchParams({
      access_token: token,
      creation_id: createJson.id,
    });
    const publishRes = await fetch(
      `https://graph.facebook.com/v21.0/${igUserId}/media_publish`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: publishParams,
      },
    );
    const publishJson = (await publishRes.json()) as {
      id?: string;
      error?: { message?: string };
    };
    if (!publishRes.ok) {
      return {
        ok: false,
        provider: "meta",
        error: publishJson.error?.message || "Instagram publish failed",
      };
    }
    const permalink = publishJson.id ? await instagramPermalink(publishJson.id, token) : "";
    return {
      ok: true,
      provider: "meta",
      externalId: publishJson.id,
      externalUrl: permalink || undefined,
    };
  } catch (err) {
    return {
      ok: false,
      provider: "meta",
      error: err instanceof Error ? err.message : "Instagram publish failed",
    };
  }
}

async function instagramPermalink(mediaId: string, token: string) {
  const params = new URLSearchParams({ fields: "permalink", access_token: token });
  const response = await fetch(`https://graph.facebook.com/v21.0/${mediaId}?${params}`);
  const json = (await response.json()) as { permalink?: string };
  return json.permalink || "";
}

/** Instagram will not publish a container until it has finished fetching the image. */
async function waitForInstagramMedia(containerId: string, token: string, timeoutMs: number) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const params = new URLSearchParams({ fields: "status_code,status", access_token: token });
    const response = await fetch(`https://graph.facebook.com/v21.0/${containerId}?${params}`);
    const json = (await response.json()) as {
      status_code?: string;
      status?: string;
      error?: { message?: string };
    };
    if (!response.ok) return json.error?.message || "Could not check the Instagram file.";
    if (json.status_code === "FINISHED") return "";
    if (json.status_code === "ERROR" || json.status_code === "EXPIRED") {
      const detail = (json.status || "").replace(/^ERROR:\s*/i, "").trim();
      return detail || "Instagram could not use this file.";
    }
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
  return "Instagram is still preparing this file. Post it again in a moment.";
}

async function publishLinkedIn(input: {
  body: string;
  mediaUrl?: string | null;
}): Promise<SocialPublishResult> {
  const token = linkedInToken();
  const author = linkedInAuthorUrn();
  if (!token || !author) {
    return {
      ok: false,
      skipped: true,
      provider: "linkedin",
      error: "LINKEDIN_ACCESS_TOKEN / LINKEDIN_AUTHOR_URN not configured",
    };
  }

  // Text-only UGC share (media attach requires LinkedIn asset upload — body notes media_url).
  const commentary = input.mediaUrl
    ? `${input.body}\n\n${input.mediaUrl}`
    : input.body;

  try {
    const response = await fetch("https://api.linkedin.com/rest/posts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
        "LinkedIn-Version": "202405",
      },
      body: JSON.stringify({
        author,
        commentary,
        visibility: "PUBLIC",
        distribution: {
          feedDistribution: "MAIN_FEED",
          targetEntities: [],
          thirdPartyDistributionChannels: [],
        },
        lifecycleState: "PUBLISHED",
        isReshareDisabledByAuthor: false,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      return {
        ok: false,
        provider: "linkedin",
        error: text.slice(0, 400) || `LinkedIn HTTP ${response.status}`,
      };
    }

    const externalId =
      response.headers.get("x-restli-id") ||
      response.headers.get("x-linkedin-id") ||
      "";
    return {
      ok: true,
      provider: "linkedin",
      externalId: externalId || undefined,
      externalUrl: externalId
        ? `https://www.linkedin.com/feed/update/${externalId}`
        : undefined,
    };
  } catch (err) {
    return {
      ok: false,
      provider: "linkedin",
      error: err instanceof Error ? err.message : "LinkedIn publish failed",
    };
  }
}
