import type { SupabaseClient } from "@supabase/supabase-js";
import { parsePosterMeta } from "@/lib/posterSocial";

export type PosterAsset = {
  id: string;
  bucket?: string | null;
  path?: string | null;
  public_url?: string | null;
  filename?: string | null;
  mime_type?: string | null;
  notes?: string | null;
  client_id?: string | null;
  series_id?: string | null;
  slide_index?: number | null;
  archived_at?: string | null;
  created_at?: string | null;
  social_pack?: unknown;
};

export function seriesIdFromAsset(asset: {
  series_id?: string | null;
  notes?: string | null;
  id?: string;
}) {
  return asset.series_id || parsePosterMeta(asset.notes)?.seriesId || asset.id || "";
}

export function isBusinessCardAsset(row: { notes?: string | null; filename?: string | null }) {
  if (row.notes === "business-card") return true;
  if (/business-card/i.test(row.filename || "")) return true;
  return parsePosterMeta(row.notes)?.kind === "business-card";
}

async function listBucketImages(
  supabase: SupabaseClient,
  input: { clientId?: string | null; archived: boolean; limit?: number },
) {
  let query = supabase
    .from("assets")
    .select("*")
    .eq("bucket", "ai-posters")
    .like("mime_type", "image/%")
    .order("created_at", { ascending: false })
    .limit(input.limit ?? 80);
  if (input.clientId) query = query.eq("client_id", input.clientId);
  const { data } = await query;
  return ((data ?? []) as PosterAsset[]).filter((row) => {
    const archived = Boolean(row.archived_at || parsePosterMeta(row.notes)?.archivedAt);
    return input.archived ? archived : !archived;
  });
}

export async function listPosterAssets(
  supabase: SupabaseClient,
  input: { clientId?: string | null; archived: boolean; limit?: number },
) {
  const rows = await listBucketImages(supabase, input);
  return rows.filter((row) => !isBusinessCardAsset(row));
}

export async function listBusinessCardAssets(
  supabase: SupabaseClient,
  input: { clientId?: string | null; archived: boolean; limit?: number },
) {
  const rows = await listBucketImages(supabase, input);
  return rows.filter((row) => isBusinessCardAsset(row));
}

export async function seriesAssets(
  supabase: SupabaseClient,
  assetId: string,
  clientId: string,
) {
  const { data: asset, error } = await supabase
    .from("assets")
    .select("*")
    .eq("id", assetId)
    .eq("client_id", clientId)
    .maybeSingle();
  if (error || !asset) return [] as PosterAsset[];
  const seriesId = seriesIdFromAsset(asset);
  const { data: byColumn } = await supabase
    .from("assets")
    .select("*")
    .eq("bucket", "ai-posters")
    .eq("client_id", clientId)
    .eq("series_id", seriesId);
  if (byColumn?.length) return byColumn as PosterAsset[];

  const { data: pool } = await supabase
    .from("assets")
    .select("*")
    .eq("bucket", "ai-posters")
    .eq("client_id", clientId);
  const matched = ((pool ?? []) as PosterAsset[]).filter(
    (row) => seriesIdFromAsset(row) === seriesId,
  );
  return matched.length ? matched : ([asset] as PosterAsset[]);
}
