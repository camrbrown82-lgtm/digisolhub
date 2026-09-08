"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function FileActions({
  id,
  href,
  filename,
}: {
  id: string;
  href?: string | null;
  filename?: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!confirm(`Delete ${filename || "this file"}?`)) return;
    setBusy(true);
    const response = await fetch(`/api/hub/assets/${id}`, { method: "DELETE" });
    setBusy(false);
    if (!response.ok) return;
    router.refresh();
  }

  return (
    <div className="flex gap-3">
      {href ? (
        <a
          href={href}
          className="text-indigo-400 hover:text-indigo-300"
          target="_blank"
          rel="noreferrer"
          download={filename || undefined}
        >
          Download
        </a>
      ) : null}
      <button
        type="button"
        onClick={() => void remove()}
        disabled={busy}
        className="text-zinc-500 hover:text-red-400"
      >
        {busy ? "Deleting…" : "Delete"}
      </button>
    </div>
  );
}
