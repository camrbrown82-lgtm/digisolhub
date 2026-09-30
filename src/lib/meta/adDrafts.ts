import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isAdCta, isAdObjective, maxDailyBudget, type AdDraft } from "@/lib/meta/ads";
import { isStoredPosterUrl } from "@/lib/posterSizes";
import { getWorkspaceClient, isDigisolClient, resolveClientId } from "@/lib/workspace";

export const DRAFT_COLUMNS =
  "id, client_id, status, brief, name, objective, daily_budget, headline, primary_text, description, cta, link_url, poster_url, locations, age_min, age_max, meta_campaign_id, meta_adset_id, meta_creative_id, meta_ad_id, error, created_at, updated_at, launched_at";

export type AdDraftRow = AdDraft & {
  client_id: string | null;
  status: "draft" | "ready" | "active" | "paused" | "failed";
  brief: string;
  error: string | null;
  created_at: string;
  updated_at: string;
  launched_at: string | null;
};

export const ADS_ONLY_DIGISOL =
  "The ads robot runs DigiSol's own Meta ad account. Switch Working on to DigiSol to use it.";

/** The ad account in Vercel belongs to DigiSol, so the robot only works in the DigiSol workspace. */
export async function adsWorkspace(supabase: SupabaseClient) {
  const client = await getWorkspaceClient(supabase);
  const clientId = (await resolveClientId(supabase)) || client?.id || "";
  if (!client || !isDigisolClient(client) || !clientId) {
    return { error: NextResponse.json({ error: ADS_ONLY_DIGISOL }, { status: 400 }) } as const;
  }
  return { client, clientId } as const;
}

function clip(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : undefined;
}

/** Validated subset of editable draft fields; unknown or invalid values are dropped. */
export function draftFields(input: Record<string, unknown>) {
  const out: Partial<AdDraftRow> = {};
  const name = clip(input.name, 120);
  if (name) out.name = name;
  if (isAdObjective(input.objective)) out.objective = input.objective;
  if (isAdCta(input.cta)) out.cta = input.cta;
  const budget = Number(input.daily_budget);
  if (Number.isFinite(budget) && budget > 0) out.daily_budget = Math.min(Math.round(budget * 100) / 100, maxDailyBudget());
  const headline = clip(input.headline, 80);
  if (headline !== undefined) out.headline = headline;
  const primary = clip(input.primary_text, 600);
  if (primary !== undefined) out.primary_text = primary;
  const description = clip(input.description, 120);
  if (description !== undefined) out.description = description;
  const link = clip(input.link_url, 500);
  if (link !== undefined && (link === "" || /^https:\/\//i.test(link))) out.link_url = link;
  const poster = clip(input.poster_url, 1000);
  if (poster !== undefined && (poster === "" || isStoredPosterUrl(poster))) out.poster_url = poster || null;
  if (Array.isArray(input.locations)) {
    out.locations = input.locations
      .map((l) => (typeof l === "string" ? l.trim().slice(0, 80) : ""))
      .filter(Boolean)
      .slice(0, 10);
  }
  const ageMin = Number(input.age_min);
  if (Number.isFinite(ageMin)) out.age_min = Math.max(18, Math.min(65, Math.round(ageMin)));
  const ageMax = Number(input.age_max);
  if (Number.isFinite(ageMax)) out.age_max = Math.max(18, Math.min(65, Math.round(ageMax)));
  return out;
}
