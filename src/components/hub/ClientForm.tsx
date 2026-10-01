"use client";

import { FormEvent, useState } from "react";

export function ClientForm() {
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/hub/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.get("name"),
        domain: data.get("domain"),
        notes: data.get("notes"),
        contactName: data.get("contactName"),
        contactEmail: data.get("contactEmail"),
        startOnboarding: data.get("startOnboarding") === "on",
      }),
    });
    const result = (await response.json()) as { id?: string; error?: string; warning?: string };
    setSaving(false);
    if (!response.ok) {
      setError(result.error || "Could not save company");
      return;
    }
    if (result.warning) window.alert(result.warning);
    const workspace = await fetch("/api/hub/workspace", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: result.id }),
    });
    if (!workspace.ok) {
      setError("Company was created, but Working on did not switch. Pick it from the menu.");
      return;
    }
    window.location.assign("/hub/brand");
  }

  return (
    <form onSubmit={onSubmit} className="max-w-xl space-y-4">
      <label className="block text-sm">
        Company name
        <input name="name" required className="hub-field" placeholder="Acme Co" />
        <span className="mt-1 block text-xs text-zinc-500">
          Starts a Brand kit for this company. You will land on Brand next to
          lock colors, voice, and logo.
        </span>
      </label>
      <label className="block text-sm">
        Domain
        <input name="domain" className="hub-field" placeholder="acme.com" />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          Main contact name
          <input name="contactName" className="hub-field" placeholder="Jane Smith" />
        </label>
        <label className="block text-sm">
          Contact email
          <input name="contactEmail" type="email" className="hub-field" placeholder="jane@acme.com" />
        </label>
      </div>
      <label className="flex items-start gap-2 text-sm text-zinc-300">
        <input name="startOnboarding" type="checkbox" defaultChecked className="mt-1" />
        <span>
          Start the Client onboarding emails for this contact
          <span className="block text-xs text-zinc-500">
            Welcome now, a check-in at day 3, and a feedback and review ask at day 14, sent from DigiSol. Edit
            them under Workflows. The company also counts as a won lead.
          </span>
        </span>
      </label>
      <label className="block text-sm">
        Notes
        <textarea name="notes" rows={3} className="hub-field resize-y" />
      </label>
      {error ? (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      <button type="submit" disabled={saving} className="hub-btn">
        {saving ? "Saving…" : "Create company"}
      </button>
    </form>
  );
}
