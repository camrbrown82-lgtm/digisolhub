import { NextResponse } from "next/server";
import { requireHubSession } from "@/lib/auth";
import { FILE_KIND_LABELS, isFileKind, uniqueZipName } from "@/lib/files";
import { getActiveClient, getActiveClientId } from "@/lib/workspace";
import { zipFiles } from "@/lib/zip";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { supabase, error } = await requireHubSession();
  if (error) return error;

  const kind = new URL(request.url).searchParams.get("kind") ?? "";
  const clientId = await getActiveClientId();
  const active = await getActiveClient(supabase);

  let query = supabase
    .from("assets")
    .select("id, bucket, path, filename, kind")
    .order("created_at", { ascending: false })
    .limit(120);
  if (clientId) query = query.eq("client_id", clientId);
  if (isFileKind(kind)) query = query.eq("kind", kind);

  const { data: assets, error: queryError } = await query;
  if (queryError) {
    return NextResponse.json({ error: queryError.message }, { status: 400 });
  }
  if (!assets?.length) {
    return NextResponse.json({ error: "No files to export" }, { status: 404 });
  }

  const used = new Set<string>();
  const entries: { name: string; data: Uint8Array }[] = [];

  for (const asset of assets) {
    if (!asset.bucket || !asset.path) continue;
    const { data, error: downloadError } = await supabase.storage
      .from(asset.bucket)
      .download(asset.path);
    if (downloadError || !data) continue;
    const folder = isFileKind(asset.kind) ? FILE_KIND_LABELS[asset.kind] : "Related files";
    const name = `${folder}/${uniqueZipName(used, asset.filename || asset.path)}`;
    entries.push({ name, data: new Uint8Array(await data.arrayBuffer()) });
  }

  if (entries.length === 0) {
    return NextResponse.json({ error: "Could not read files from storage" }, { status: 400 });
  }

  const zip = zipFiles(entries);
  const slug = (active?.name || "all-companies")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const suffix = isFileKind(kind) ? `-${kind}` : "";
  const filename = `${slug || "files"}${suffix}.zip`;

  return new NextResponse(new Uint8Array(zip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
