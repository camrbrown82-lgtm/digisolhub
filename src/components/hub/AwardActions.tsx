"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AwardActions({
  id,
  featured,
  canFeature,
  verifyUrl,
  mention,
}: {
  id: string;
  featured: boolean;
  canFeature: boolean;
  verifyUrl: string;
  mention: string;
}) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function copyMention() {
    await navigator.clipboard.writeText(mention).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function toggleFeatured() {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/hub/awards/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ featured: !featured }),
    }).catch(() => null);
    setBusy(false);
    if (!res?.ok) {
      const body = (await res?.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error || "Could not update.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex min-w-[150px] flex-col items-start gap-1.5 text-xs">
      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(verifyUrl)}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => void copyMention()}
        title="Copies the mention, then opens Facebook. Paste it into the post box."
        className="font-semibold text-sky-300 hover:text-sky-200"
      >
        Share on Facebook
      </a>
      <button type="button" onClick={copyMention} className="text-indigo-300 hover:text-indigo-200">
        {copied ? "Mention copied" : "Copy mention"}
      </button>
      <a href={verifyUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-300 hover:text-indigo-200">
        Verify page
      </a>
      {canFeature || featured ? (
        <label className="flex items-center gap-1.5 text-zinc-300">
          <input type="checkbox" checked={featured} disabled={busy} onChange={toggleFeatured} />
          Feature on winners page
        </label>
      ) : null}
      {error ? <span className="text-rose-300">{error}</span> : null}
    </div>
  );
}
