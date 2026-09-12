"use client";

import { useState } from "react";

export function CopySnippet({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="space-y-3">
      <pre className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-300">
        <code>{value}</code>
      </pre>
      <button type="button" onClick={() => void copy()} className="hub-btn-secondary">
        {copied ? "Copied" : "Copy snippet"}
      </button>
    </div>
  );
}
