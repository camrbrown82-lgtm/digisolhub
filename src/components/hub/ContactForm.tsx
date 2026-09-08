"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const field = "hub-field";

export function ContactForm({
  initial,
  contactId,
  clients = [],
  defaultClientId = "",
}: {
  initial?: {
    name?: string | null;
    email?: string;
    company?: string | null;
    domain?: string | null;
    phone?: string | null;
    service?: string | null;
    tags?: string[] | null;
    client_id?: string | null;
  };
  contactId?: string;
  clients?: { id: string; name: string }[];
  defaultClientId?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const data = new FormData(event.currentTarget);
    const payload = {
      name: String(data.get("name") ?? ""),
      email: String(data.get("email") ?? ""),
      company: String(data.get("company") ?? ""),
      domain: String(data.get("domain") ?? ""),
      phone: String(data.get("phone") ?? ""),
      service: String(data.get("service") ?? ""),
      client_id: String(data.get("client_id") ?? "") || null,
      tags: String(data.get("tags") ?? "")
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    };

    const url = contactId ? `/api/hub/contacts/${contactId}` : "/api/hub/contacts";
    const method = contactId ? "PATCH" : "POST";
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = (await response.json()) as { id?: string; error?: string };
    setSaving(false);
    if (!response.ok) {
      setError(result.error || "Could not save contact");
      return;
    }
    router.push(`/hub/contacts/${contactId || result.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm">
        Name
        <input name="name" defaultValue={initial?.name ?? ""} className={field} />
      </label>
      <label className="text-sm">
        Email
        <input
          name="email"
          type="email"
          required
          defaultValue={initial?.email ?? ""}
          className={field}
        />
      </label>
      <label className="text-sm sm:col-span-2">
        Company workspace
        <select
          name="client_id"
          defaultValue={initial?.client_id ?? defaultClientId}
          className={field}
        >
          <option value="">Unassigned</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm">
        Company
        <input name="company" defaultValue={initial?.company ?? ""} className={field} />
      </label>
      <label className="text-sm">
        Domain
        <input name="domain" defaultValue={initial?.domain ?? ""} className={field} />
      </label>
      <label className="text-sm">
        Phone
        <input name="phone" defaultValue={initial?.phone ?? ""} className={field} />
      </label>
      <label className="text-sm">
        Service
        <input name="service" defaultValue={initial?.service ?? ""} className={field} />
      </label>
      <label className="text-sm sm:col-span-2">
        Tags (comma-separated)
        <input
          name="tags"
          defaultValue={(initial?.tags ?? []).join(", ")}
          className={field}
        />
      </label>
      {error ? (
        <p className="sm:col-span-2 text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      <div className="sm:col-span-2">
        <button type="submit" disabled={saving} className="hub-btn">
          {saving ? "Saving…" : contactId ? "Save contact" : "Create contact"}
        </button>
      </div>
    </form>
  );
}
