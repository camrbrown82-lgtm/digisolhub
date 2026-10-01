import { isAdCta, isAdObjective, type AdCta, type AdObjective } from "@/lib/meta/adOptions";
import { ACTIVE_SOCIAL_CHANNELS, type SocialCampaignChannel } from "@/lib/campaignChannels";
import { isStoredPosterUrl } from "@/lib/posterSizes";

export type PlanPost = {
  id: string;
  kind: "post";
  channel: SocialCampaignChannel;
  dayOffset: number;
  hour: number;
  body: string;
  posterUrl: string;
  reason: string;
  included: boolean;
  status: "planned" | "queued" | "skipped" | "failed";
  socialPostId?: string;
  error?: string;
};

export type PlanAd = {
  id: string;
  kind: "ad";
  name: string;
  objective: AdObjective;
  headline: string;
  primaryText: string;
  description: string;
  cta: AdCta;
  linkUrl: string;
  posterUrl: string;
  locations: string[];
  ageMin: number;
  ageMax: number;
  reason: string;
  included: boolean;
  status: "planned" | "live" | "skipped" | "failed";
  error?: string;
};

export type PlanItem = PlanPost | PlanAd;

export type SocialPlan = {
  id: string;
  status: "draft" | "running" | "cancelled";
  brief: string;
  weekly_budget: number;
  summary: string;
  why: string;
  items: PlanItem[];
  error: string | null;
  created_at: string;
  approved_at: string | null;
};

const channels = new Set<string>(ACTIVE_SOCIAL_CHANNELS);

/** Ad spend per day from a weekly cap, never above the robot's daily maximum. */
export function dailyFromWeekly(weekly: number, maxDaily: number) {
  if (!(weekly > 0)) return 0;
  return Math.min(maxDaily, Math.max(1, Math.round((weekly / 7) * 100) / 100));
}

function clip(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function hourOf(value: unknown) {
  const hour = Number(value);
  if (!Number.isFinite(hour)) return 11;
  return Math.max(8, Math.min(20, Math.round(hour)));
}

/** Turns a Mountain Time wall clock into a real instant. */
export function mountainInstant(day: string, hour: number) {
  const utcGuess = new Date(`${day}T${String(hour).padStart(2, "0")}:00:00Z`);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Edmonton",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(utcGuess);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value || 0);
  const wallAsUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") % 24, get("minute"));
  return new Date(utcGuess.getTime() - (wallAsUtc - utcGuess.getTime()));
}

function edmontonDay(offset: number) {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Edmonton",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const [year, month, day] = today.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + offset)).toISOString().slice(0, 10);
}

/** The next Mountain Time slot for this weekday offset, pushed a day ahead if that time has passed. */
export function nextPostInstant(dayOffset: number, hour: number) {
  const offset = Math.max(0, Math.min(6, Math.round(dayOffset)));
  let instant = mountainInstant(edmontonDay(offset), hour);
  if (instant.getTime() < Date.now() + 10 * 60 * 1000) {
    instant = mountainInstant(edmontonDay(offset + 1), hour);
  }
  return instant;
}

export function formatMountain(instant: Date) {
  return instant.toLocaleString("en-CA", {
    timeZone: "America/Edmonton",
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function planItems(value: unknown, posters: string[], site: string): PlanItem[] {
  if (!Array.isArray(value)) return [];
  const allowed = new Set(posters.filter(isStoredPosterUrl));
  const items: PlanItem[] = [];
  for (const raw of value.slice(0, 8)) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as Record<string, unknown>;
    const poster = clip(row.posterUrl, 1000);
    const posterUrl = allowed.has(poster) ? poster : Array.from(allowed)[0] || "";
    if (row.kind === "ad") {
      if (items.some((item) => item.kind === "ad")) continue;
      const locations = Array.isArray(row.locations)
        ? row.locations.map((place) => clip(place, 80)).filter(Boolean).slice(0, 8)
        : [];
      items.push({
        id: clip(row.id, 40) || "ad",
        kind: "ad",
        name: clip(row.name, 120) || "Weekly ads",
        objective: isAdObjective(row.objective) ? row.objective : "OUTCOME_TRAFFIC",
        headline: clip(row.headline, 40),
        primaryText: clip(row.primaryText, 500),
        description: clip(row.description, 30),
        cta: isAdCta(row.cta) ? row.cta : "LEARN_MORE",
        linkUrl: /^https:\/\//i.test(clip(row.linkUrl, 500)) ? clip(row.linkUrl, 500) : site,
        posterUrl,
        locations: locations.length ? locations : ["Alberta"],
        ageMin: Math.max(18, Math.min(65, Math.round(Number(row.ageMin) || 25))),
        ageMax: Math.max(18, Math.min(65, Math.round(Number(row.ageMax) || 65))),
        reason: clip(row.reason, 300),
      included: row.included !== false && Boolean(posterUrl),
      status: "planned",
    });
    continue;
    }
    const channel = clip(row.channel, 20).toLowerCase();
    if (!channels.has(channel)) continue;
    const body = clip(row.body, 2000);
    if (!body) continue;
    items.push({
      id: clip(row.id, 40) || `post-${items.length + 1}`,
      kind: "post",
      channel: channel as SocialCampaignChannel,
      dayOffset: Math.max(0, Math.min(6, Math.round(Number(row.dayOffset) || 0))),
      hour: hourOf(row.hour),
      body,
      posterUrl,
      reason: clip(row.reason, 300),
      included: row.included !== false && (channel !== "instagram" || Boolean(posterUrl)),
      status: "planned",
    });
  }
  return items;
}
