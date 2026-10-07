import type { ReactElement } from "react";
import { ImageResponse } from "next/og";
import type { SupabaseClient } from "@supabase/supabase-js";
import { awardBadgeElement } from "@/lib/awardBadgeImage";
import { awardTheme } from "@/lib/awardTheme";
import { competitiveBadgeElement } from "@/lib/competitive/badgeImage";
import { competitiveBadgeLine, loadDigisolEarnedBadges } from "@/lib/competitive/publicBadge";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import { HOUSE_AWARD_ID, loadAward } from "@/lib/websiteAward";

const NOTE = "digisol-badge:";

function safeName(value: string) {
  return value.replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ").trim() || "badge";
}

async function pngFrom(element: ReactElement) {
  const image = new ImageResponse(element, { width: 640, height: 240 });
  return Buffer.from(await image.arrayBuffer());
}

/** Saves a PNG of each badge DigiSol has earned into Hub Files. Skips ones already saved. */
export async function ensureDigisolBadgeFiles(supabase: SupabaseClient, clientId: string) {
  const { data: existing } = await supabase
    .from("assets")
    .select("notes")
    .eq("client_id", clientId)
    .like("notes", `${NOTE}%`);
  const saved = new Set((existing ?? []).map((row) => String(row.notes || "")));
  const theme = await awardTheme();
  const copies: { key: string; filename: string; element: ReactElement }[] = [];

  const db = hasAdminClient() ? createAdminClient() : supabase;
  const house = await loadAward(db, HOUSE_AWARD_ID).catch(() => ({ state: "missing" as const }));
  if (house.state === "valid") {
    copies.push({
      key: "house",
      filename: "DigiSol — We pass our own audit.png",
      element: awardBadgeElement(house, theme),
    });
  }
  const earned = await loadDigisolEarnedBadges().catch(() => []);
  for (const badge of earned) {
    copies.push({
      key: badge.key,
      filename: `DigiSol — ${safeName(competitiveBadgeLine(badge.key))}.png`,
      element: competitiveBadgeElement(badge, theme),
    });
  }

  for (const copy of copies) {
    const notes = `${NOTE}${copy.key}`;
    if (saved.has(notes)) continue;
    const png = await pngFrom(copy.element);
    const path = `badges/${copy.key}.png`;
    const { error: uploadError } = await supabase.storage.from("assets").upload(path, png, {
      contentType: "image/png",
      upsert: true,
    });
    if (uploadError) {
      console.error("Could not store badge file", copy.key, uploadError.message);
      continue;
    }
    const { data: stored } = supabase.storage.from("assets").getPublicUrl(path);
    const { error: insertError } = await supabase.from("assets").insert({
      bucket: "assets",
      path,
      public_url: stored.publicUrl,
      filename: copy.filename,
      mime_type: "image/png",
      kind: "image",
      byte_size: png.length,
      notes,
      client_id: clientId,
    });
    if (insertError) console.error("Could not list badge file", copy.key, insertError.message);
  }
}
