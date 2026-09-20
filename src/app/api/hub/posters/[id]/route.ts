import { NextResponse } from "next/server";
import { requireHubSession } from "@/lib/auth";
import { parsePosterMeta } from "@/lib/posterSocial";
import { seriesAssets } from "@/lib/posterArchive";

type Params = { params: { id: string } };

function withArchivedNote(notes: string | null | undefined, archivedAt: string | null) {
  const meta = parsePosterMeta(notes) || { kind: "ai-poster" };
  return JSON.stringify({ ...meta, archivedAt });
}

export async function PATCH(request: Request, { params }: Params) {
  const { supabase, error } = await requireHubSession();
  if (error) return error;

  let archived = true;
  try {
    const body = (await request.json()) as { archived?: boolean };
    archived = body.archived !== false;
  } catch {
    archived = true;
  }

  const rows = await seriesAssets(supabase, params.id);
  if (!rows.length) {
    return NextResponse.json({ error: "Poster not found" }, { status: 404 });
  }

  const archivedAt = archived ? new Date().toISOString() : null;
  const ids = rows.map((row) => row.id);
  const { error: updateError } = await supabase
    .from("assets")
    .update({ archived_at: archivedAt })
    .in("id", ids);

  if (updateError) {
    for (const row of rows) {
      await supabase
        .from("assets")
        .update({ notes: withArchivedNote(row.notes, archivedAt) })
        .eq("id", row.id);
    }
  }

  return NextResponse.json({ ok: true, archived, count: ids.length });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { supabase, error } = await requireHubSession();
  if (error) return error;

  const rows = await seriesAssets(supabase, params.id);
  if (!rows.length) {
    return NextResponse.json({ error: "Poster not found" }, { status: 404 });
  }

  const paths = rows
    .filter((row) => row.bucket && row.path)
    .map((row) => ({ bucket: row.bucket as string, path: row.path as string }));
  for (const row of rows) {
    const pdfUrl = parsePosterMeta(row.notes)?.pdfUrl;
    if (pdfUrl && row.bucket) {
      const marker = `/${row.bucket}/`;
      const index = pdfUrl.indexOf(marker);
      if (index >= 0) {
        paths.push({ bucket: row.bucket, path: decodeURIComponent(pdfUrl.slice(index + marker.length).split("?")[0]) });
      }
    }
  }

  const storagePaths = Array.from(
    new Set(paths.filter((item) => item.bucket === "ai-posters").map((item) => item.path)),
  );
  if (storagePaths.length) {
    await supabase.storage.from("ai-posters").remove(storagePaths);
  }

  const { error: deleteError } = await supabase
    .from("assets")
    .delete()
    .in("id", rows.map((row) => row.id));
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, count: rows.length });
}
