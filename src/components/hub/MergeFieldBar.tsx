"use client";

import { TEMPLATE_VARIABLES, TEMPLATE_VARIABLE_HINTS } from "@/lib/emailTemplates";

export function MergeFieldBar({
  onInsert,
  disabled,
}: {
  onInsert: (token: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {TEMPLATE_VARIABLES.map((token) => (
        <button
          key={token}
          type="button"
          disabled={disabled}
          title={TEMPLATE_VARIABLE_HINTS[token]}
          onClick={() => onInsert(token)}
          className="rounded-full border border-zinc-700 px-2.5 py-1 font-mono text-[11px] text-zinc-300 hover:border-indigo-500 hover:text-white disabled:opacity-50"
        >
          {token}
        </button>
      ))}
    </div>
  );
}
