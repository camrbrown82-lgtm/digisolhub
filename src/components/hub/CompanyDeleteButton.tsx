"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";

export function CompanyDeleteButton({ clientId, name }: { clientId: string; name: string }) {
  const [busy, setBusy] = useState(false);

  async function onDelete() {
    const typed = window.prompt(
      `Delete ${name} and everything stored for them?\n\nContacts, files, posts, ads, audits, and analytics for this company are removed. This cannot be undone.\n\nType the company name to confirm.`,
    );
    if (typed == null) return;
    if (typed.trim().toLowerCase() !== name.trim().toLowerCase()) {
      window.alert("The name did not match. Nothing was deleted.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(`/api/hub/clients/${clientId}`, { method: "DELETE" });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        window.alert(result.error || "Could not delete the company");
        return;
      }
      window.location.assign("/hub/clients");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => void onDelete()}
      className="inline-flex items-center gap-1 text-sm text-rose-300 hover:text-rose-200 disabled:opacity-60"
    >
      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
      {busy ? "Deleting…" : "Remove"}
    </button>
  );
}
