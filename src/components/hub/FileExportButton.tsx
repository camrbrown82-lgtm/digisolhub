"use client";

import { useState } from "react";
import type { FileKind } from "@/lib/files";

export function FileExportButton({
  kind,
  disabled,
}: {
  kind?: FileKind | "";
  disabled?: boolean;
}) {
  const [status, setStatus] = useState("");

  async function exportZip() {
    setStatus("Preparing zip…");
    const query = kind ? `?kind=${kind}` : "";
    const response = await fetch(`/api/hub/assets/export${query}`);
    if (!response.ok) {
      const result = (await response.json().catch(() => ({}))) as { error?: string };
      setStatus(result.error || "Export failed");
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const match = response.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/);
    link.href = url;
    link.download = match?.[1] || "files.zip";
    link.click();
    URL.revokeObjectURL(url);
    setStatus("Downloaded");
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => void exportZip()}
        disabled={disabled}
        className="hub-btn-secondary"
      >
        Export zip
      </button>
      {status ? <p className="text-sm text-zinc-400">{status}</p> : null}
    </div>
  );
}
