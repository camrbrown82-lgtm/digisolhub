"use client";

import { useState } from "react";

export function AwardEmbedCode({ embed, className = "" }: { embed: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(embed).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <textarea
        readOnly
        value={embed}
        rows={5}
        onFocus={(event) => event.currentTarget.select()}
        className="w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3 font-mono text-xs text-zinc-200"
      />
      <button
        type="button"
        onClick={() => void copy()}
        className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-300"
      >
        {copied ? "Copied" : "Copy embed code"}
      </button>
    </div>
  );
}
