"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2 } from "lucide-react";

export function ContactDeleteButton({
  contactId,
  label = "Delete",
  redirectTo,
  className = "hub-btn-secondary inline-flex items-center gap-1.5 text-rose-300 hover:text-rose-200",
}: {
  contactId: string;
  label?: string;
  redirectTo?: string;
  className?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onDelete() {
    if (
      !window.confirm(
        "Delete this contact permanently? Sends and notes tied to them may be removed.",
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(`/api/hub/contacts/${contactId}`, {
        method: "DELETE",
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        window.alert(result.error || "Could not delete contact");
        return;
      }
      if (redirectTo) {
        router.push(redirectTo);
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => void onDelete()}
      className={className}
      title="Delete contact"
    >
      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
      {busy ? "Deleting…" : label}
    </button>
  );
}
