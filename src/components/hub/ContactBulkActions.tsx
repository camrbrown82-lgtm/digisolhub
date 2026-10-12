"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";

function boxes(section?: string) {
  const selector = section
    ? `input[name="contactIds"][data-section="${section}"]`
    : 'input[name="contactIds"]';
  return Array.from(document.querySelectorAll<HTMLInputElement>(selector));
}

function selectedIds() {
  return boxes()
    .filter((box) => box.checked)
    .map((box) => box.value);
}

/** Header checkbox that selects every contact in one table, or every contact on the page. */
export function ContactSelectAll({ section, label = "Select all" }: { section?: string; label?: string }) {
  function toggle(checked: boolean) {
    for (const box of boxes(section)) box.checked = checked;
    document.dispatchEvent(new Event("contact-selection"));
  }

  return (
    <input
      type="checkbox"
      aria-label={label}
      title={label}
      onChange={(event) => toggle(event.target.checked)}
      className="h-4 w-4 accent-indigo-500"
    />
  );
}

export function ContactBulkActions() {
  const router = useRouter();
  const [count, setCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const update = () => setCount(selectedIds().length);
    const onChange = (event: Event) => {
      const target = event.target as HTMLInputElement | null;
      if (target?.name === "contactIds") update();
    };
    document.addEventListener("change", onChange);
    document.addEventListener("contact-selection", update);
    update();
    return () => {
      document.removeEventListener("change", onChange);
      document.removeEventListener("contact-selection", update);
    };
  }, []);

  function clear() {
    for (const box of boxes()) box.checked = false;
    for (const box of Array.from(document.querySelectorAll<HTMLInputElement>('input[aria-label^="Select all"]'))) {
      box.checked = false;
    }
    setCount(0);
  }

  async function onDelete() {
    const ids = selectedIds();
    if (!ids.length) return;
    if (
      !window.confirm(
        `Delete ${ids.length} contact${ids.length === 1 ? "" : "s"} permanently? Their notes and send history go too.`,
      )
    ) {
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/hub/contacts/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const result = (await response.json()) as { error?: string; deleted?: number };
      if (!response.ok) {
        setMessage(result.error || "Could not delete those contacts.");
        return;
      }
      setMessage(`Deleted ${result.deleted ?? 0} contact${result.deleted === 1 ? "" : "s"}.`);
      clear();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="sticky top-2 z-10 flex flex-wrap items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950/95 px-4 py-2 text-sm backdrop-blur">
      <label className="inline-flex items-center gap-2 text-zinc-300">
        <ContactSelectAll label="Select all contacts on this page" />
        Select all
      </label>
      <span className="text-zinc-400">{count} selected</span>
      <button
        type="button"
        disabled={busy || count === 0}
        onClick={() => void onDelete()}
        className="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 px-3 py-1 text-xs text-rose-300 hover:bg-rose-500/10 disabled:opacity-40"
      >
        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
        {busy ? "Deleting…" : "Delete selected"}
      </button>
      {count > 0 ? (
        <button type="button" onClick={clear} className="text-xs text-zinc-400 hover:text-zinc-200">
          Clear
        </button>
      ) : null}
      {message ? <span className="text-xs text-zinc-400">{message}</span> : null}
    </div>
  );
}
