"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function NewWorkflowButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function create() {
    setBusy(true);
    const response = await fetch("/api/hub/workflows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "New lead nurture", trigger: "new_lead" }),
    });
    const result = (await response.json()) as { id?: string };
    if (result.id) router.push(`/hub/workflows/${result.id}`);
    setBusy(false);
  }

  return (
    <button type="button" onClick={create} disabled={busy} className="hub-btn">
      {busy ? "Creating…" : "New workflow"}
    </button>
  );
}
