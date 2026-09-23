import type { SupabaseClient } from "@supabase/supabase-js";
import {
  type AbVariant,
  summarizeAbSends,
  type AbSendRow,
} from "@/lib/campaignAb";
import { normalizeContactAbVariant } from "@/lib/contactAbVariants";

export type AbEngagementEvent = "sent" | "opened" | "clicked" | "bounced";

/**
 * Pipe A/B results back into Contacts + Campaigns.
 * - Stamps the contact's ab_variant from the send
 * - Recomputes campaign winner_variant from engagement
 * - Writes an auto audit note when the leader is clear
 */
export async function logAbVariantEngagement(
  db: SupabaseClient,
  input: {
    sendId: string;
    contactId?: string | null;
    campaignId?: string | null;
    variant?: string | null;
    event: AbEngagementEvent;
  },
) {
  const variant = normalizeContactAbVariant(input.variant);

  if (input.contactId && variant) {
    await db
      .from("contacts")
      .update({ ab_variant: variant })
      .eq("id", input.contactId);
  }

  const campaignId = input.campaignId;
  if (!campaignId) {
    return { contactUpdated: Boolean(input.contactId && variant), campaignSynced: false };
  }

  const synced = await syncCampaignAbResults(db, campaignId, {
    reason: `auto:${input.event}`,
  });
  return {
    contactUpdated: Boolean(input.contactId && variant),
    campaignSynced: synced.ok,
    winner: synced.winner,
  };
}

export async function syncCampaignAbResults(
  db: SupabaseClient,
  campaignId: string,
  opts?: { reason?: string; writeAudit?: boolean },
) {
  const { data: campaign } = await db
    .from("campaigns")
    .select("id, is_ab, winner_variant, name")
    .eq("id", campaignId)
    .maybeSingle();

  if (!campaign) return { ok: false as const, winner: null };

  const { data: sends } = await db
    .from("sends")
    .select("variant, status, opened_at, clicked_at, bounced_at, created_at, contact_id")
    .eq("campaign_id", campaignId);

  const rows = (sends ?? []) as AbSendRow[];
  const summary = summarizeAbSends(rows, "week");

  // Stamp contacts that still lack ab_variant from their send arm.
  for (const row of sends ?? []) {
    const arm = normalizeContactAbVariant(row.variant);
    const contactId = row.contact_id as string | null;
    if (!arm || !contactId) continue;
    await db.from("contacts").update({ ab_variant: arm }).eq("id", contactId);
  }

  if (!campaign.is_ab) {
    return { ok: true as const, winner: null, summary };
  }

  const winner: AbVariant | null =
    summary.leader === "A" || summary.leader === "B" ? summary.leader : null;

  if (winner && winner !== campaign.winner_variant) {
    await db
      .from("campaigns")
      .update({ winner_variant: winner })
      .eq("id", campaignId);

    if (opts?.writeAudit !== false) {
      const note = [
        `Auto A/B sync (${opts?.reason || "engagement"}).`,
        `A: ${summary.a.sent} sent · ${summary.a.openRate}% open · ${summary.a.clickRate}% click.`,
        `B: ${summary.b.sent} sent · ${summary.b.openRate}% open · ${summary.b.clickRate}% click.`,
        `Leader: ${winner}.`,
      ].join(" ");

      await db.from("campaign_audits").insert({
        campaign_id: campaignId,
        period: "week",
        note,
        winner_pick: winner,
        created_by: null,
      });
    }
  }

  return { ok: true as const, winner, summary };
}
