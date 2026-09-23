import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ALBERTA_PROSPECT_SEED,
  normalizeProspectUrl,
  prospectHostKey,
} from "@/lib/prospectAudit/seedCatalog";
import { PROSPECT_AUDIT_BATCH_DEFAULT } from "@/lib/prospectAudit/limits";

export type EnsureProspectQueueResult = {
  pendingBefore: number;
  inserted: number;
  skippedExisting: number;
  catalogRemaining: number;
};

/**
 * Keep at least `minPending` DigiSol prospects ready for the morning cron.
 * Inserts from the Alberta seed catalog, skipping hosts already in the table.
 */
export async function ensureProspectQueue(
  db: SupabaseClient,
  clientId: string,
  opts?: { minPending?: number; fillCount?: number },
): Promise<EnsureProspectQueueResult> {
  const minPending = Math.max(
    1,
    opts?.minPending ?? PROSPECT_AUDIT_BATCH_DEFAULT,
  );
  const fillCount = Math.max(
    minPending,
    opts?.fillCount ?? Math.max(minPending, 10),
  );

  const { count: pendingBefore } = await db
    .from("prospects")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId)
    .in("audit_status", ["pending", "failed"]);

  const need = Math.max(0, minPending - (pendingBefore ?? 0));
  if (need === 0) {
    return {
      pendingBefore: pendingBefore ?? 0,
      inserted: 0,
      skippedExisting: 0,
      catalogRemaining: 0,
    };
  }

  const { data: existing } = await db
    .from("prospects")
    .select("url")
    .eq("client_id", clientId)
    .limit(2000);

  const usedHosts = new Set(
    (existing ?? []).map((row) => prospectHostKey(String(row.url || ""))),
  );

  const candidates = ALBERTA_PROSPECT_SEED.filter((seed) => {
    const host = prospectHostKey(seed.url);
    if (!host || usedHosts.has(host)) return false;
    usedHosts.add(host);
    return true;
  }).slice(0, Math.max(need, Math.min(fillCount, need + 5)));

  if (candidates.length === 0) {
    return {
      pendingBefore: pendingBefore ?? 0,
      inserted: 0,
      skippedExisting: ALBERTA_PROSPECT_SEED.length,
      catalogRemaining: 0,
    };
  }

  const rows = candidates.map((seed) => ({
    client_id: clientId,
    business_name: seed.businessName,
    url: normalizeProspectUrl(seed.url),
    trade: seed.trade,
    city: seed.city,
    region: seed.region || "AB",
    audit_status: "pending",
    casl_status: "pending",
    metadata: {
      seededFrom: "alberta_prospect_catalog",
      seededAt: new Date().toISOString(),
    },
  }));

  const { data: inserted, error } = await db
    .from("prospects")
    .insert(rows)
    .select("id");

  if (error) {
    throw new Error(`Prospect queue seed failed: ${error.message}`);
  }

  return {
    pendingBefore: pendingBefore ?? 0,
    inserted: inserted?.length ?? 0,
    skippedExisting: ALBERTA_PROSPECT_SEED.length - candidates.length,
    catalogRemaining: Math.max(
      0,
      ALBERTA_PROSPECT_SEED.length - usedHosts.size,
    ),
  };
}
