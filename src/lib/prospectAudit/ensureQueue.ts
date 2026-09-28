import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ALBERTA_PROSPECT_SEED,
  normalizeProspectUrl,
  prospectHostKey,
} from "@/lib/prospectAudit/seedCatalog";
import { discoverProspects, type DiscoveryResult } from "@/lib/prospectAudit/discover";
import { PROSPECT_AUDIT_BATCH_DEFAULT } from "@/lib/prospectAudit/limits";

export type EnsureProspectQueueResult = {
  pendingBefore: number;
  inserted: number;
  skippedExisting: number;
  catalogRemaining: number;
  discovered?: number;
  discoveryTier?: DiscoveryResult["tier"];
  discoverySearches?: DiscoveryResult["searches"];
};

/**
 * Keep at least `minPending` DigiSol prospects ready for the morning cron.
 * Inserts from the Alberta seed catalog first, then finds new businesses with
 * web search (trades first, other sectors once trades are exhausted).
 */
export async function ensureProspectQueue(
  db: SupabaseClient,
  clientId: string,
  opts?: { minPending?: number; fillCount?: number; sectors?: string[] },
): Promise<EnsureProspectQueueResult> {
  const minPending = Math.max(
    1,
    opts?.minPending ?? PROSPECT_AUDIT_BATCH_DEFAULT,
  );
  const fillCount = Math.max(
    minPending,
    opts?.fillCount ?? Math.max(minPending, 10),
  );

  let pendingQuery = db
    .from("prospects")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId)
    .eq("audit_status", "pending");
  if (opts?.sectors?.length) pendingQuery = pendingQuery.in("trade", opts.sectors);
  const { count: pendingBefore } = await pendingQuery;

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
    .limit(5000);

  const usedHosts = new Set(
    (existing ?? []).map((row) => prospectHostKey(String(row.url || ""))),
  );

  const candidates = ALBERTA_PROSPECT_SEED.filter((seed) => {
    if (opts?.sectors?.length && !opts.sectors.includes(seed.trade)) return false;
    const host = prospectHostKey(seed.url);
    if (!host || usedHosts.has(host)) return false;
    usedHosts.add(host);
    return true;
  }).slice(0, Math.max(need, Math.min(fillCount, need + 5)));

  const seededAt = new Date().toISOString();
  const rows: Record<string, unknown>[] = candidates.map((seed) => ({
    client_id: clientId,
    business_name: seed.businessName,
    url: normalizeProspectUrl(seed.url),
    trade: seed.trade,
    city: seed.city,
    region: seed.region || "AB",
    audit_status: "pending",
    casl_status: "pending",
    metadata: { seededFrom: "alberta_prospect_catalog", seededAt },
  }));

  let discovery: DiscoveryResult | null = null;
  if (rows.length < need) {
    try {
      discovery = await discoverProspects(db, clientId, {
        usedHosts,
        want: Math.max(need - rows.length, Math.min(fillCount, need + 3)),
        sectors: opts?.sectors,
      });
    } catch (err) {
      console.warn(
        "[prospect-audit] discovery failed",
        err instanceof Error ? err.message : err,
      );
    }
    for (const p of discovery?.prospects ?? []) {
      rows.push({
        client_id: clientId,
        business_name: p.businessName,
        url: p.url,
        trade: p.trade,
        city: p.city,
        region: "AB",
        contact_email: p.email,
        audit_status: "pending",
        casl_status: "pending",
        metadata: {
          seededFrom: "web_discovery",
          seededAt,
          discoveryTier: discovery?.tier,
        },
      });
    }
  }

  const discoveryInfo = discovery
    ? {
        discovered: discovery.prospects.length,
        discoveryTier: discovery.tier,
        discoverySearches: discovery.searches,
      }
    : {};

  if (rows.length === 0) {
    return {
      pendingBefore: pendingBefore ?? 0,
      inserted: 0,
      skippedExisting: ALBERTA_PROSPECT_SEED.length,
      catalogRemaining: 0,
      ...discoveryInfo,
    };
  }

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
      ALBERTA_PROSPECT_SEED.length -
        ALBERTA_PROSPECT_SEED.filter((s) => usedHosts.has(prospectHostKey(s.url))).length,
    ),
    ...discoveryInfo,
  };
}
