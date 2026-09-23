import { normalizeCampaignChannel, type CampaignChannel } from "@/lib/campaignChannels";

export type AttributionPayload = {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  fbclid: string | null;
  fbp: string | null;
  fbc: string | null;
  landing_path: string | null;
  campaign_channel: CampaignChannel | null;
  ab_variant: string | null;
};

export function emptyAttribution(): AttributionPayload {
  return {
    utm_source: null,
    utm_medium: null,
    utm_campaign: null,
    utm_content: null,
    utm_term: null,
    fbclid: null,
    fbp: null,
    fbc: null,
    landing_path: null,
    campaign_channel: null,
    ab_variant: null,
  };
}

function pick(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, 500) : null;
}

/** Build Meta _fbc cookie value from fbclid when cookie missing. */
export function fbcFromFbclid(fbclid: string | null | undefined, now = Date.now()) {
  const id = pick(fbclid);
  if (!id) return null;
  return `fb.1.${now}.${id}`;
}

export function parseAttributionFromBody(
  body: Record<string, unknown>,
): AttributionPayload {
  const nested =
    body.attribution && typeof body.attribution === "object"
      ? (body.attribution as Record<string, unknown>)
      : body;

  const utm_source = pick(nested.utm_source ?? nested.utmSource);
  const utm_medium = pick(nested.utm_medium ?? nested.utmMedium);
  const utm_campaign = pick(nested.utm_campaign ?? nested.utmCampaign);
  const utm_content = pick(nested.utm_content ?? nested.utmContent);
  const utm_term = pick(nested.utm_term ?? nested.utmTerm);
  const fbclid = pick(nested.fbclid);
  const fbp = pick(nested.fbp);
  const fbc =
    pick(nested.fbc) || fbcFromFbclid(fbclid);
  const landing_path = pick(nested.landing_path ?? nested.landingPath);

  let campaign_channel =
    normalizeCampaignChannel(
      pick(nested.campaign_channel ?? nested.campaignChannel) || undefined,
    ) || null;

  if (!campaign_channel) {
    const source = (utm_source || "").toLowerCase();
    if (
      source.includes("facebook") ||
      source === "fb" ||
      source === "meta" ||
      source.includes("instagram") ||
      Boolean(fbclid)
    ) {
      campaign_channel =
        source.includes("instagram") || source === "ig"
          ? "instagram"
          : "facebook";
    }
  }

  const ab_variant = pick(
    nested.ab_variant ?? nested.abVariant ?? nested.utm_content ?? utm_content,
  );

  return {
    utm_source,
    utm_medium,
    utm_campaign,
    utm_content,
    utm_term,
    fbclid,
    fbp,
    fbc,
    landing_path,
    campaign_channel,
    ab_variant,
  };
}

export function attributionTags(attr: AttributionPayload): string[] {
  const tags: string[] = [];
  if (attr.campaign_channel === "facebook" || attr.fbclid) tags.push("facebook");
  if (attr.campaign_channel === "instagram") tags.push("instagram");
  if (attr.utm_campaign) tags.push(`utm:${attr.utm_campaign.slice(0, 40)}`);
  if (attr.ab_variant) tags.push(`variant:${attr.ab_variant.slice(0, 20)}`);
  return tags;
}
