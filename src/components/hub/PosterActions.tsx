"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Archive, ArchiveRestore, Trash2 } from "lucide-react";

export function PosterActions({
  id,
  archived = false,
}: {
  id: string;
  archived?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"archive" | "delete" | "">("");

  async function archive(nextArchived: boolean) {
    setBusy("archive");
    const response = await fetch(`/api/hub/posters/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: nextArchived }),
    });
    setBusy("");
    if (!response.ok) return;
    router.refresh();
  }

  async function remove() {
    if (!confirm("Delete this poster set? This cannot be undone.")) return;
    setBusy("delete");
    const response = await fetch(`/api/hub/posters/${id}`, { method: "DELETE" });
    setBusy("");
    if (!response.ok) return;
    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => void archive(!archived)}
        disabled={Boolean(busy)}
        className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs font-medium text-zinc-100 hover:bg-white/10 disabled:opacity-60"
      >
        {archived ? (
          <ArchiveRestore className="h-3.5 w-3.5" aria-hidden="true" />
        ) : (
          <Archive className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        {busy === "archive"
          ? archived
            ? "Restoring…"
            : "Archiving…"
          : archived
            ? "Restore"
            : "Archive"}
      </button>
      <button
        type="button"
        onClick={() => void remove()}
        disabled={Boolean(busy)}
        className="inline-flex items-center gap-2 rounded-full border border-red-400/20 px-3 py-2 text-xs font-medium text-red-300 hover:bg-red-500/10 disabled:opacity-60"
      >
        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
        {busy === "delete" ? "Deleting…" : "Delete"}
      </button>
    </div>
  );
}
