"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function NewTemplateButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function create() {
    setBusy(true);
    const response = await fetch("/api/hub/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Untitled template",
        subject: "Hello from DigiSol",
        html: "<table width='100%'><tr><td style='font-family:Inter,Arial,sans-serif;padding:24px'><h1>DigiSol</h1><p>Where engineering meets growth.</p></td></tr></table>",
      }),
    });
    const result = (await response.json()) as { id?: string };
    if (result.id) router.push(`/hub/email/${result.id}`);
    setBusy(false);
  }

  return (
    <button type="button" onClick={create} disabled={busy} className="hub-btn">
      {busy ? "Creating…" : "New template"}
    </button>
  );
}
