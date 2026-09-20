"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LEAD_CHANNELS,
  LEAD_SOURCES,
  LEAD_STAGES,
  type LeadRecord,
} from "@/lib/lead-pipeline";

const field = "hub-field";

function dateInputValue(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 16);
}

export function LeadForm({
  initial,
  leadId,
  clients = [],
  defaultClientId = "",
}: {
  initial?: Partial<LeadRecord>;
  leadId?: string;
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
    const payload: Record<string, unknown> = {
      name: String(data.get("name") ?? ""),
      email: String(data.get("email") ?? ""),
      phone: String(data.get("phone") ?? ""),
      company: String(data.get("company") ?? ""),
      service: String(data.get("service") ?? ""),
      source: String(data.get("source") ?? "door_to_door"),
      channel: String(data.get("channel") ?? "in_person"),
      location: String(data.get("location") ?? ""),
      campaign: String(data.get("campaign") ?? ""),
      stage: String(data.get("stage") ?? "new"),
      estimated_value: String(data.get("estimated_value") ?? ""),
      actual_value: String(data.get("actual_value") ?? ""),
      lost_reason: String(data.get("lost_reason") ?? ""),
      next_follow_up_at: String(data.get("next_follow_up_at") ?? ""),
      client_id: String(data.get("client_id") ?? "") || null,
    };
    if (!leadId) payload.notes = String(data.get("notes") ?? "");

    const url = leadId ? `/api/hub/leads/${leadId}` : "/api/hub/leads";
    const method = leadId ? "PATCH" : "POST";
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = (await response.json()) as { id?: string; error?: string };
    setSaving(false);
    if (!response.ok) {
      setError(result.error || "Could not save lead");
      return;
    }
    router.push(`/hub/leads/${leadId || result.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm">
        Name
        <input name="name" defaultValue={initial?.name ?? ""} className={field} />
      </label>
      <label className="text-sm">
        Phone
        <input name="phone" defaultValue={initial?.phone ?? ""} className={field} />
      </label>
      <label className="text-sm">
        Email
        <input
          name="email"
          type="email"
          defaultValue={initial?.email ?? ""}
          className={field}
        />
      </label>
      <label className="text-sm">
        Company
        <input name="company" defaultValue={initial?.company ?? ""} className={field} />
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
        Source
        <select name="source" defaultValue={initial?.source ?? "door_to_door"} className={field}>
          {LEAD_SOURCES.map((source) => (
            <option key={source.id} value={source.id}>
              {source.label}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm">
        Channel
        <select name="channel" defaultValue={initial?.channel ?? "in_person"} className={field}>
          {LEAD_CHANNELS.map((channel) => (
            <option key={channel.id} value={channel.id}>
              {channel.label}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm">
        Where you met
        <input
          name="location"
          placeholder="Street, event, or neighborhood"
          defaultValue={initial?.location ?? ""}
          className={field}
        />
      </label>
      <label className="text-sm">
        Campaign / route
        <input
          name="campaign"
          placeholder="Saturday downtown sweep"
          defaultValue={initial?.campaign ?? ""}
          className={field}
        />
      </label>
      <label className="text-sm">
        Service interest
        <input name="service" defaultValue={initial?.service ?? ""} className={field} />
      </label>
      <label className="text-sm">
        Stage
        <select name="stage" defaultValue={initial?.stage ?? "new"} className={field}>
          {LEAD_STAGES.map((stage) => (
            <option key={stage.id} value={stage.id}>
              {stage.label}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm">
        Estimated value
        <input
          name="estimated_value"
          type="number"
          min="0"
          step="0.01"
          defaultValue={initial?.estimated_value ?? ""}
          className={field}
        />
      </label>
      <label className="text-sm">
        Closed value
        <input
          name="actual_value"
          type="number"
          min="0"
          step="0.01"
          defaultValue={initial?.actual_value ?? ""}
          className={field}
        />
      </label>
      <label className="text-sm">
        Next follow-up
        <input
          name="next_follow_up_at"
          type="datetime-local"
          defaultValue={dateInputValue(initial?.next_follow_up_at)}
          className={field}
        />
      </label>
      <label className="text-sm">
        Lost reason
        <input name="lost_reason" defaultValue={initial?.lost_reason ?? ""} className={field} />
      </label>
      {!leadId ? (
        <label className="text-sm sm:col-span-2">
          Opening conversation
          <textarea
            name="notes"
            rows={4}
            className={`${field} resize-y`}
            placeholder="What they said, who they are, and the next step."
          />
        </label>
      ) : null}
      {error ? (
        <p className="sm:col-span-2 text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      <div className="sm:col-span-2">
        <button type="submit" disabled={saving} className="hub-btn">
          {saving ? "Saving…" : leadId ? "Save lead" : "Add lead"}
        </button>
      </div>
    </form>
  );
}
