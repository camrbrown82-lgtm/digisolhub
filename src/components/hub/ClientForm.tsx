"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function ClientForm() {
  const router = useRouter();
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
      }),
    });
    const result = (await response.json()) as { id?: string; error?: string };
    setSaving(false);
    if (!response.ok) {
      setError(result.error || "Could not save company");
      return;
    }
    await fetch("/api/hub/workspace", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: result.id }),
    });
    router.push("/hub");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="max-w-xl space-y-4">
      <label className="block text-sm">
        Company name
        <input name="name" required className="hub-field" placeholder="Acme Co" />
      </label>
      <label className="block text-sm">
        Domain
        <input name="domain" className="hub-field" placeholder="acme.com" />
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
