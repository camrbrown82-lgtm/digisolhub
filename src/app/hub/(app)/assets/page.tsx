import Link from "next/link";
import { FileActions } from "@/components/hub/FileActions";
import { FileExportButton } from "@/components/hub/FileExportButton";
import { FileImporter } from "@/components/hub/FileImporter";
import { WorkspaceScope } from "@/components/hub/WorkspaceScope";
import { FILE_KIND_LABELS, isFileKind, type FileKind } from "@/lib/files";
import { createClient } from "@/lib/supabase/server";
import { getActiveClient } from "@/lib/workspace";

const FILTERS = [
  { href: "/hub/assets", label: "All files", kind: "" },
  { href: "/hub/assets?kind=image", label: "Images", kind: "image" },
  { href: "/hub/assets?kind=datasheet", label: "Data sheets", kind: "datasheet" },
  { href: "/hub/assets?kind=related", label: "Related", kind: "related" },
] as const;

function formatBytes(value?: number | null) {
  if (!value) return "";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function AssetsPage({
  searchParams,
}: {
  searchParams?: { kind?: string };
}) {
  const supabase = await createClient();
  const active = await getActiveClient(supabase);
  const kind = searchParams?.kind ?? "";
  let query = supabase.from("assets").select("*").order("created_at", { ascending: false });
  if (active) query = query.eq("client_id", active.id);
  if (isFileKind(kind)) query = query.eq("kind", kind);
  const { data: assets } = await query;
  const files = assets ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-white">Files</h1>
          <WorkspaceScope companyName={active?.name} noun="files" />
        </div>
        <FileExportButton kind={isFileKind(kind) ? kind : ""} disabled={files.length === 0} />
      </div>
      <FileImporter />
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => {
          const selected = (kind || "") === filter.kind;
          return (
            <Link
              key={filter.href}
              href={filter.href}
              className={`rounded-full px-3 py-1.5 text-sm ${
                selected
                  ? "bg-indigo-600/20 text-white"
                  : "border border-zinc-800 text-zinc-400 hover:text-white"
              }`}
            >
              {filter.label}
            </Link>
          );
        })}
      </div>
      {files.length === 0 ? (
        <p className="rounded-2xl border border-zinc-800 px-4 py-8 text-sm text-zinc-500">
          No files in this view yet. Import images, data sheets, or related files above.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {files.map((asset) => {
            const label = isFileKind(asset.kind)
              ? FILE_KIND_LABELS[asset.kind as FileKind]
              : "Related files";
            return (
              <figure
                key={asset.id}
                className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/40"
              >
                {asset.mime_type?.startsWith("image/") && asset.public_url ? (
                  <img
                    src={asset.public_url}
                    alt={asset.filename ?? "Asset"}
                    className="h-40 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-40 items-center justify-center px-4 text-center text-sm text-zinc-500">
                    {asset.filename}
                  </div>
                )}
                <figcaption className="space-y-1 p-3 text-xs text-zinc-400">
                  <p className="truncate text-zinc-200">{asset.filename}</p>
                  <p>
                    {label}
                    {asset.byte_size ? ` · ${formatBytes(asset.byte_size)}` : ""}
                  </p>
                  <FileActions
                    id={asset.id}
                    href={asset.public_url}
                    filename={asset.filename}
                  />
                </figcaption>
              </figure>
            );
          })}
        </div>
      )}
    </div>
  );
}
