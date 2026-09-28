import type { SocialCampaignChannel } from "@/lib/campaignChannels";
import { LINKEDIN_ENABLED } from "@/lib/site";

const ALL_CONTENT_TEST_CHANNELS = [
  { id: "facebook", label: "Facebook post", source: "facebook", medium: "social", publish: "facebook" },
  { id: "instagram", label: "Instagram post", source: "instagram", medium: "social", publish: "instagram" },
  { id: "linkedin", label: "LinkedIn post", source: "linkedin", medium: "social", publish: "linkedin" },
  { id: "meta_ads", label: "Meta ad", source: "facebook", medium: "paid_social", publish: null },
  { id: "google_ads", label: "Google ad", source: "google", medium: "cpc", publish: null },
  { id: "email", label: "Email", source: "email", medium: "email", publish: null },
  { id: "print", label: "Poster / print (QR)", source: "print", medium: "offline", publish: null },
  { id: "other", label: "Other", source: "other", medium: "referral", publish: null },
] as const satisfies ReadonlyArray<{
  id: string;
  label: string;
  source: string;
  medium: string;
  publish: SocialCampaignChannel | null;
}>;

export type ContentTestChannel = (typeof ALL_CONTENT_TEST_CHANNELS)[number]["id"];

export const CONTENT_TEST_CHANNELS = ALL_CONTENT_TEST_CHANNELS.filter(
  (channel) => channel.id !== "linkedin" || LINKEDIN_ENABLED,
);
export type TestVariant = "A" | "B";
export const TEST_VARIANTS: TestVariant[] = ["A", "B"];

export function isContentTestChannel(value: string): value is ContentTestChannel {
  return CONTENT_TEST_CHANNELS.some((channel) => channel.id === value);
}

export function channelInfo(id: string) {
  return CONTENT_TEST_CHANNELS.find((channel) => channel.id === id) ?? null;
}

export function slugifyTestName(name: string) {
  return (
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "ab-test"
  );
}

/** Landing URL tagged so GA4 and lead attribution resolve to this test, channel, and variant. */
export function trackingUrl(landingUrl: string, slug: string, channel: string, variant: TestVariant) {
  const info = channelInfo(channel);
  const url = new URL(landingUrl);
  url.searchParams.set("utm_source", info?.source ?? channel);
  url.searchParams.set("utm_medium", info?.medium ?? "referral");
  url.searchParams.set("utm_campaign", slug);
  url.searchParams.set("utm_content", variant.toLowerCase());
  return url.toString();
}

function channelFor(source: string, medium: string): ContentTestChannel {
  const s = source.toLowerCase();
  const m = medium.toLowerCase();
  const exact = CONTENT_TEST_CHANNELS.find((c) => c.source === s && c.medium === m);
  if (exact) return exact.id;
  if (s.includes("instagram") || s === "ig") return "instagram";
  if (s.includes("linkedin")) return "linkedin";
  if (s.includes("facebook") || s === "fb" || s === "meta") {
    return m.includes("paid") || m === "cpc" ? "meta_ads" : "facebook";
  }
  if (s === "google" && (m === "cpc" || m === "ppc")) return "google_ads";
  if (m === "email") return "email";
  return "other";
}

export type ChannelMetrics = {
  impressions?: number;
  clicks?: number;
  spend?: number;
  engagements?: number;
};

export type VariantMetrics = Partial<Record<ContentTestChannel, ChannelMetrics>>;

export type ContentTestRow = {
  id: string;
  client_id: string | null;
  name: string;
  slug: string;
  goal: string | null;
  hypothesis: string | null;
  landing_url: string;
  channels: string[];
  status: "draft" | "live" | "completed";
  winner_variant: TestVariant | null;
  source: { kind?: string; dispatchSlug?: string } | null;
  kaylev: {
    analysis?: string;
    analyzedAt?: string;
    recommendation?: string;
    actions?: string[];
    nextTest?: string;
  } | null;
  created_at: string;
};

export type ContentVariantRow = {
  id: string;
  test_id: string;
  variant: TestVariant;
  label: string | null;
  body: string | null;
  asset_id: string | null;
  email_template_id: string | null;
  media_url: string | null;
  metrics: VariantMetrics | null;
};

export type SocialPostRow = {
  id: string;
  test_id: string | null;
  channel: string;
  variant: string;
  status: string;
  external_url: string | null;
  error_message: string | null;
  published_at: string | null;
};

export type GaRow = {
  campaign: string;
  content: string;
  source: string;
  medium: string;
  sessions: number;
  engagedSessions: number;
  keyEvents: number;
};

export type LeadRow = {
  utm_campaign: string | null;
  utm_content: string | null;
  utm_source: string | null;
  utm_medium: string | null;
};

export type ChannelResult = {
  channel: ContentTestChannel;
  sessions: number;
  engaged: number;
  keyEvents: number;
  leads: number;
  impressions: number;
  clicks: number;
  spend: number;
  engagements: number;
};

export type VariantResult = {
  variant: TestVariant;
  totals: Omit<ChannelResult, "channel">;
  byChannel: ChannelResult[];
  posts: SocialPostRow[];
};

function emptyChannel(channel: ContentTestChannel): ChannelResult {
  return {
    channel,
    sessions: 0,
    engaged: 0,
    keyEvents: 0,
    leads: 0,
    impressions: 0,
    clicks: 0,
    spend: 0,
    engagements: 0,
  };
}

export function computeVariantResults(input: {
  test: ContentTestRow;
  variants: ContentVariantRow[];
  gaRows: GaRow[];
  leads: LeadRow[];
  posts: SocialPostRow[];
}): VariantResult[] {
  const slug = input.test.slug.toLowerCase();
  return TEST_VARIANTS.map((variant) => {
    const key = variant.toLowerCase();
    const channels = new Map<ContentTestChannel, ChannelResult>();
    const bucket = (id: ContentTestChannel) => {
      const current = channels.get(id) ?? emptyChannel(id);
      channels.set(id, current);
      return current;
    };
    for (const id of input.test.channels) {
      if (isContentTestChannel(id)) bucket(id);
    }
    for (const row of input.gaRows) {
      if (row.campaign !== slug || row.content !== key) continue;
      const target = bucket(channelFor(row.source, row.medium));
      target.sessions += row.sessions;
      target.engaged += row.engagedSessions;
      target.keyEvents += row.keyEvents;
    }
    for (const lead of input.leads) {
      if ((lead.utm_campaign || "").toLowerCase() !== slug) continue;
      if ((lead.utm_content || "").toLowerCase() !== key) continue;
      bucket(channelFor(lead.utm_source || "", lead.utm_medium || "")).leads += 1;
    }
    const manual = input.variants.find((row) => row.variant === variant)?.metrics ?? {};
    for (const [id, metrics] of Object.entries(manual)) {
      if (!isContentTestChannel(id) || !metrics) continue;
      const target = bucket(id);
      target.impressions += Number(metrics.impressions) || 0;
      target.clicks += Number(metrics.clicks) || 0;
      target.spend += Number(metrics.spend) || 0;
      target.engagements += Number(metrics.engagements) || 0;
    }
    const byChannel = Array.from(channels.values());
    const totals = byChannel.reduce(
      (sum, row) => ({
        sessions: sum.sessions + row.sessions,
        engaged: sum.engaged + row.engaged,
        keyEvents: sum.keyEvents + row.keyEvents,
        leads: sum.leads + row.leads,
        impressions: sum.impressions + row.impressions,
        clicks: sum.clicks + row.clicks,
        spend: sum.spend + row.spend,
        engagements: sum.engagements + row.engagements,
      }),
      { sessions: 0, engaged: 0, keyEvents: 0, leads: 0, impressions: 0, clicks: 0, spend: 0, engagements: 0 },
    );
    return {
      variant,
      totals,
      byChannel,
      posts: input.posts.filter((post) => post.variant === variant),
    };
  });
}

/** Leads decide first, then key events, engaged visits, clicks, and visits. */
export function leadingVariant(results: VariantResult[]) {
  const [a, b] = results;
  if (!a || !b) return { leader: null as TestVariant | null, note: "Not enough data yet." };
  const order: (keyof VariantResult["totals"])[] = ["leads", "keyEvents", "engaged", "clicks", "sessions"];
  const total = a.totals.sessions + b.totals.sessions + a.totals.clicks + b.totals.clicks;
  const leads = a.totals.leads + b.totals.leads;
  for (const metric of order) {
    if (a.totals[metric] === b.totals[metric]) continue;
    const leader = a.totals[metric] > b.totals[metric] ? a.variant : b.variant;
    const early = leads < 3 && total < 60;
    return {
      leader,
      note: early
        ? `Variant ${leader} is ahead on ${metricLabel(metric)}, but it's too early to call.`
        : `Variant ${leader} leads on ${metricLabel(metric)}.`,
    };
  }
  return { leader: null, note: total ? "Dead even so far." : "No clicks or visits tracked yet." };
}

function metricLabel(metric: string) {
  return (
    {
      leads: "leads",
      keyEvents: "conversions",
      engaged: "engaged visits",
      clicks: "ad clicks",
      sessions: "visits",
    } as Record<string, string>
  )[metric] ?? metric;
}
