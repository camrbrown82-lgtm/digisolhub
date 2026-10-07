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

export function isArchiveCopy(row: { path?: string | null; notes?: string | null }) {
  if ((row.path || "").startsWith("archive-")) return true;
  return Boolean(parsePosterMeta(row.notes)?.archiveOf);
}

export function isAiPosterNotes(notes: string) {
  if (!notes || notes === "business-card") return false;
  if (notes === "ai-poster") return true;
  const meta = parsePosterMeta(notes);
  if (!meta || meta.archiveOf) return false;
  if (meta.kind === "business-card" || meta.kind === "social-studio") return false;
  return meta.kind === "ai-poster" || !meta.kind;
}

/** Keep one archived copy of a saved poster. The working poster stays on AI posters. */
export async function savePosterArchiveCopy(
  supabase: SupabaseClient,
  input: {
    clientId?: string | null;
    sourcePath: string;
    bytes: Buffer;
    caption: string;
    filename: string;
    notes: string;
    seriesId?: string | null;
  },
) {
  if (!input.sourcePath || input.sourcePath.startsWith("archive-") || !input.bytes.length || !isAiPosterNotes(input.notes)) return;
  const path = `archive-${input.sourcePath}`;
  const { error: uploadError } = await supabase.storage.from("ai-posters").upload(path, input.bytes, {
    contentType: "image/png",
    upsert: true,
    cacheControl: "0",
  });
  if (uploadError) {
    console.error("Could not store poster archive copy", uploadError.message);
    return;
  }
  const archivedAt = new Date().toISOString();
  const publicUrl = `${supabase.storage.from("ai-posters").getPublicUrl(path).data.publicUrl}?v=${Date.now()}`;
  const parsed = parsePosterMeta(input.notes);
  const seriesId = input.seriesId || parsed?.seriesId || "";
  const notes = JSON.stringify({
    ...(parsed || { kind: "ai-poster" }),
    kind: "ai-poster",
    archiveOf: input.sourcePath,
    archivedAt,
    ...(seriesId ? { seriesId: `archive-${seriesId}` } : {}),
  });
  const { data: existing } = await supabase
    .from("assets")
    .select("id")
    .eq("bucket", "ai-posters")
    .eq("path", path)
    .maybeSingle();
  if (existing?.id) {
    const { error } = await supabase
      .from("assets")
      .update({
        public_url: publicUrl,
        caption: input.caption,
        filename: input.filename,
        notes,
        byte_size: input.bytes.length,
        archived_at: archivedAt,
        ...(seriesId ? { series_id: `archive-${seriesId}` } : {}),
      })
      .eq("id", existing.id);
    if (error) {
      await supabase
        .from("assets")
        .update({ public_url: publicUrl, caption: input.caption, filename: input.filename, notes, byte_size: input.bytes.length })
        .eq("id", existing.id);
    }
    return;
  }
  const row = {
    bucket: "ai-posters",
    path,
    public_url: publicUrl,
    filename: input.filename,
    mime_type: "image/png",
    kind: "image",
    client_id: input.clientId ?? null,
    caption: input.caption,
    notes,
    byte_size: input.bytes.length,
    archived_at: archivedAt,
    ...(seriesId ? { series_id: `archive-${seriesId}` } : {}),
  };
  const inserted = await supabase.from("assets").insert(row);
  if (inserted.error) {
    await supabase.from("assets").insert({
      bucket: row.bucket,
      path: row.path,
      public_url: row.public_url,
      filename: row.filename,
      mime_type: row.mime_type,
      kind: row.kind,
      client_id: row.client_id,
      caption: row.caption,
      notes,
    });
  }
}

/** Copy saved posters that do not have an archive row yet. A later save refreshes the same copy. */
export async function ensurePosterArchiveCopies(supabase: SupabaseClient, clientId?: string | null) {
  if (!clientId) return;
  const live = await listPosterAssets(supabase, { clientId, archived: false, limit: 40 });
  const { data: copies } = await supabase
    .from("assets")
    .select("path")
    .eq("bucket", "ai-posters")
    .eq("client_id", clientId)
    .like("path", "archive-%");
  const have = new Set((copies ?? []).map((row) => String((row as { path?: string }).path || "")));
  const missing = live.filter(
    (row) => row.path && row.public_url && !have.has(`archive-${row.path}`) && isAiPosterNotes(row.notes || ""),
  );
  await Promise.all(
    missing.slice(0, 24).map(async (row) => {
      const response = await fetch(row.public_url || "").catch(() => null);
      if (!response?.ok) return;
      const bytes = Buffer.from(await response.arrayBuffer());
      if (!bytes.length || bytes.length > 12 * 1024 * 1024) return;
      const meta = parsePosterMeta(row.notes);
      await savePosterArchiveCopy(supabase, {
        clientId,
        sourcePath: row.path || "",
        bytes,
        caption: meta?.caption || row.filename || "Poster",
        filename: row.filename || "poster.png",
        notes: row.notes || "ai-poster",
        seriesId: row.series_id || meta?.seriesId,
      });
    }),
  );
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
