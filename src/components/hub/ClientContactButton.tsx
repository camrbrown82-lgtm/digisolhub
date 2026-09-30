"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

/** Adds a sign-up contact to a company that doesn't have one, and starts its onboarding emails. */
export function ClientContactButton({ clientId }: { clientId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const data = new FormData(event.currentTarget);
    const response = await fetch(`/api/hub/clients/${clientId}/contact`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.get("name"),
        email: data.get("email"),
        startOnboarding: data.get("startOnboarding") === "on",
      }),
    });
    const result = (await response.json().catch(() => ({}))) as { error?: string };
    setSaving(false);
    if (!response.ok) {
      setError(result.error || "Could not add the contact.");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-sm text-indigo-300 hover:text-indigo-200">
        Add sign-up contact
      </button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-2 flex flex-wrap items-end gap-2">
      <input name="name" className="hub-field w-40" placeholder="Name" aria-label="Contact name" />
      <input name="email" type="email" required className="hub-field w-56" placeholder="Email" aria-label="Contact email" />
      <label className="flex items-center gap-1.5 text-xs text-zinc-400">
        <input name="startOnboarding" type="checkbox" defaultChecked />
        Start onboarding emails
      </label>
      <button type="submit" disabled={saving} className="hub-btn">
        {saving ? "Saving…" : "Add"}
      </button>
      <button type="button" onClick={() => setOpen(false)} className="text-sm text-zinc-500 hover:text-zinc-300">
        Cancel
      </button>
      {error ? (
        <p className="w-full text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
