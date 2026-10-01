import sharp from "sharp";
import { metaAccessToken, metaAdAccountId, metaGraphVersion, metaPixelId } from "@/lib/meta/config";
import { isAdCta, isAdObjective, type AdObjective } from "@/lib/meta/adOptions";
import { fitInto } from "@/lib/stampLogo";

export { AD_CTAS, AD_OBJECTIVES, isAdCta, isAdObjective, type AdCta, type AdObjective } from "@/lib/meta/adOptions";

export type AdDraft = {
  id: string;
  name: string;
  objective: string;
  daily_budget: number;
  headline: string;
  primary_text: string;
  description: string;
  cta: string;
  link_url: string;
  poster_url: string | null;
  locations: string[];
  age_min: number;
  age_max: number;
  meta_campaign_id: string | null;
  meta_adset_id: string | null;
  meta_creative_id: string | null;
  meta_ad_id: string | null;
};

/** Highest daily budget the robot may set, in the ad account's currency. */
export function maxDailyBudget() {
  const value = Number(process.env.META_ADS_MAX_DAILY_BUDGET);
  return Number.isFinite(value) && value > 0 ? value : 50;
}

export function metaPageId() {
  return process.env.META_PAGE_ID?.trim() || "";
}

class MetaApiError extends Error {}

type GraphError = { message?: string; error_user_title?: string; error_user_msg?: string; code?: number };

async function graph<T>(method: "GET" | "POST" | "DELETE", path: string, params: Record<string, unknown> = {}) {
  const token = metaAccessToken();
  if (!token) throw new MetaApiError("Meta access token is not set. Add META_CAPI_ACCESS_TOKEN in Vercel.");
  const url = new URL(`https://graph.facebook.com/${metaGraphVersion()}/${path.replace(/^\//, "")}`);
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...params, access_token: token })) {
    if (value === undefined || value === null) continue;
    const text = typeof value === "string" ? value : JSON.stringify(value);
    if (method === "GET") url.searchParams.set(key, text);
    else body.set(key, text);
  }
  const response = await fetch(url, {
    method,
    ...(method === "GET" ? {} : { body, headers: { "Content-Type": "application/x-www-form-urlencoded" } }),
  });
  const json = (await response.json().catch(() => ({}))) as T & { error?: GraphError };
  if (!response.ok || json.error) {
    const error = json.error;
    const detail = [error?.error_user_title, error?.error_user_msg || error?.message].filter(Boolean).join(": ");
    throw new MetaApiError(detail || `Meta API HTTP ${response.status}`);
  }
  return json as T;
}

export type AdAccountInfo = {
  ok: boolean;
  error?: string;
  name?: string;
  currency?: string;
  status?: number;
};

export async function adAccountInfo(): Promise<AdAccountInfo> {
  const account = metaAdAccountId();
  if (!account) return { ok: false, error: "META_AD_ACCOUNT_ID is not set." };
  try {
    const info = await graph<{ name?: string; currency?: string; account_status?: number }>("GET", account, {
      fields: "name,currency,account_status",
    });
    return { ok: true, name: info.name, currency: info.currency, status: info.account_status };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not reach the ad account." };
  }
}

type GeoHit = {
  key: string;
  type: string;
  name: string;
  country_code?: string;
  region?: string;
  region_id?: string | number;
};

/**
 * Meta rejects an audience that includes a place and a broader place around it
 * ("Some locations conflict with each other"). Calgary inside Alberta, or
 * Alberta inside Canada, is that conflict. A radius around a city does the
 * same when two nearby cities overlap, so cities are targeted on their own boundary.
 */
function geoLocationsWithoutConflicts(hits: GeoHit[]) {
  const seen = new Set<string>();
  const unique = hits.filter((hit) => {
    const id = `${hit.type}:${hit.key}`;
    if (!hit.key || seen.has(id)) return false;
    seen.add(id);
    return hit.type === "country" || hit.type === "region" || hit.type === "city";
  });
  const cities = unique.filter((hit) => hit.type === "city");
  const regions = unique.filter((hit) => hit.type === "region");
  const countries = unique.filter((hit) => hit.type === "country");

  const cityRegionKeys = new Set(
    cities
      .flatMap((city) => [
        city.region_id != null ? String(city.region_id) : "",
        city.region?.trim().toLowerCase() || "",
      ])
      .filter(Boolean),
  );
  const coveredCountries = new Set(
    [...cities, ...regions]
      .map((hit) => hit.country_code?.trim().toUpperCase())
      .filter((code): code is string => Boolean(code)),
  );
  const keptRegions = regions.filter((region) => {
    const key = String(region.key);
    const name = region.name.trim().toLowerCase();
    return !cityRegionKeys.has(key) && !cityRegionKeys.has(name);
  });
  const keptCountries = countries.filter((country) => {
    const key = country.key.trim().toUpperCase();
    const code = country.country_code?.trim().toUpperCase();
    return !coveredCountries.has(key) && !(code && coveredCountries.has(code));
  });

  return {
    ...(keptCountries.length ? { countries: keptCountries.map((country) => country.key) } : {}),
    ...(keptRegions.length ? { regions: keptRegions.map((region) => ({ key: String(region.key) })) } : {}),
    ...(cities.length ? { cities: cities.map((city) => ({ key: String(city.key) })) } : {}),
  };
}

/** Turns place names ("Calgary", "Alberta", "Canada") into Meta geo targeting. Unknown names are skipped. */
async function geoTargeting(locations: string[]) {
  const hits: GeoHit[] = [];
  for (const place of locations.map((l) => l.trim()).filter(Boolean).slice(0, 10)) {
    const found = await graph<{ data?: GeoHit[] }>("GET", "search", {
      type: "adgeolocation",
      q: place,
      location_types: ["country", "region", "city"],
      limit: 5,
    }).catch(() => ({ data: [] as GeoHit[] }));
    const list = found.data ?? [];
    const query = place.toLowerCase();
    const hit = list.find((item) => item.name?.trim().toLowerCase() === query) ?? list[0];
    if (hit) hits.push(hit);
  }
  const geo = geoLocationsWithoutConflicts(hits);
  if (!geo.countries?.length && !geo.regions?.length && !geo.cities?.length) return { countries: ["CA"] };
  return geo;
}

/** Minor units (cents) for Meta budgets; a few currencies have none. */
function toMinorUnits(amount: number, currency = "CAD") {
  const zeroDecimal = ["JPY", "KRW", "VND", "CLP", "ISK", "HUF", "TWD", "COP", "IDR"];
  return String(Math.round(zeroDecimal.includes(currency.toUpperCase()) ? amount : amount * 100));
}

async function uploadPoster(posterUrl: string) {
  const response = await fetch(posterUrl);
  if (!response.ok) throw new MetaApiError("Could not load the poster image.");
  const fitted = await fitInto(Buffer.from(await response.arrayBuffer()), 1080, 1350);
  const jpeg = await sharp(fitted).flatten({ background: "#09090b" }).jpeg({ quality: 90 }).toBuffer();
  const uploaded = await graph<{ images?: Record<string, { hash?: string }> }>("POST", `${metaAdAccountId()}/adimages`, {
    bytes: jpeg.toString("base64"),
  });
  const hash = Object.values(uploaded.images ?? {})[0]?.hash;
  if (!hash) throw new MetaApiError("Meta did not return an image hash for the poster.");
  return hash;
}

export type CreatedAd = { campaignId: string; adsetId: string; creativeId: string; adId: string };

/**
 * Builds the campaign, ad set, creative, and ad in Meta — every piece PAUSED, so nothing spends until Launch.
 * If any step fails the half-built campaign is deleted.
 */
export async function createPausedCampaign(draft: AdDraft): Promise<CreatedAd> {
  const account = metaAdAccountId();
  const pageId = metaPageId();
  if (!account) throw new MetaApiError("META_AD_ACCOUNT_ID is not set.");
  if (!pageId) throw new MetaApiError("META_PAGE_ID is not set.");
  if (!draft.poster_url) throw new MetaApiError("Pick a poster for the ad first.");
  if (!draft.link_url) throw new MetaApiError("The ad needs a website link.");
  if (draft.daily_budget > maxDailyBudget()) {
    throw new MetaApiError(`Daily budget is over the robot's cap of ${maxDailyBudget()}.`);
  }
  const objective: AdObjective = isAdObjective(draft.objective) ? draft.objective : "OUTCOME_LEADS";
  const pixelId = metaPixelId();
  if (objective === "OUTCOME_LEADS" && !pixelId) throw new MetaApiError("Leads campaigns need the Meta Pixel ID.");

  const info = await adAccountInfo();
  if (!info.ok) throw new MetaApiError(info.error || "Could not reach the ad account.");
  const [imageHash, geo] = await Promise.all([uploadPoster(draft.poster_url), geoTargeting(draft.locations)]);

  const campaign = await graph<{ id: string }>("POST", `${account}/campaigns`, {
    name: draft.name,
    objective,
    status: "PAUSED",
    special_ad_categories: [],
    daily_budget: toMinorUnits(draft.daily_budget, info.currency),
    bid_strategy: "LOWEST_COST_WITHOUT_CAP",
  });

  try {
    const adset = await graph<{ id: string }>("POST", `${account}/adsets`, {
      name: `${draft.name} · audience`,
      campaign_id: campaign.id,
      status: "PAUSED",
      billing_event: "IMPRESSIONS",
      destination_type: "WEBSITE",
      optimization_goal: objective === "OUTCOME_LEADS" ? "OFFSITE_CONVERSIONS" : "LINK_CLICKS",
      ...(objective === "OUTCOME_LEADS" ? { promoted_object: { pixel_id: pixelId, custom_event_type: "LEAD" } } : {}),
      targeting: {
        geo_locations: geo,
        age_min: Math.max(18, Math.min(65, draft.age_min)),
        age_max: Math.max(18, Math.min(65, draft.age_max)),
        targeting_automation: { advantage_audience: 0 },
      },
    });

    const cta = isAdCta(draft.cta) ? draft.cta : "LEARN_MORE";
    const linkData = {
      image_hash: imageHash,
      link: draft.link_url,
      message: draft.primary_text,
      name: draft.headline,
      description: draft.description || undefined,
      call_to_action: { type: cta, value: { link: draft.link_url } },
    };
    const creativeParams = (instagram: boolean) => ({
      name: `${draft.name} · creative`,
      url_tags: "utm_source=facebook&utm_medium=paid_social&utm_campaign={{campaign.name}}&utm_content={{ad.name}}",
      object_story_spec: {
        page_id: pageId,
        ...(instagram && process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID?.trim()
          ? { instagram_user_id: process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID.trim() }
          : {}),
        link_data: linkData,
      },
    });
    const creative = await graph<{ id: string }>("POST", `${account}/adcreatives`, creativeParams(true)).catch(
      (error) => {
        if (!/instagram/i.test(error instanceof Error ? error.message : "")) throw error;
        return graph<{ id: string }>("POST", `${account}/adcreatives`, creativeParams(false));
      },
    );

    const ad = await graph<{ id: string }>("POST", `${account}/ads`, {
      name: `${draft.name} · ad`,
      adset_id: adset.id,
      creative: { creative_id: creative.id },
      status: "PAUSED",
    });
    return { campaignId: campaign.id, adsetId: adset.id, creativeId: creative.id, adId: ad.id };
  } catch (error) {
    await graph("DELETE", campaign.id).catch(() => null);
    throw error;
  }
}

/** Turns the ad, ad set, and campaign on (or off). All three must be ACTIVE for the ad to deliver. */
export async function setCampaignLive(draft: AdDraft, live: boolean) {
  const status = live ? "ACTIVE" : "PAUSED";
  const ids = live
    ? [draft.meta_ad_id, draft.meta_adset_id, draft.meta_campaign_id]
    : [draft.meta_campaign_id];
  for (const id of ids) {
    if (id) await graph("POST", id, { status });
  }
}

export function metaErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Meta request failed.";
}
