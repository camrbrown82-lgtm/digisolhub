"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LEAD_ACTIVITY_TYPES,
  labelFor,
  type LeadActivityType,
} from "@/lib/lead-pipeline";

type Activity = {
  id: string;
  type: string;
  body: string | null;
  from_stage: string | null;
  to_stage: string | null;
  occurred_at: string;
};

const logTypes = LEAD_ACTIVITY_TYPES.filter(
  (type) => type.id !== "created" && type.id !== "stage_change",
);

export function LeadTimeline({
  leadId,
  activities,
}: {
  leadId: string;
  activities: Activity[];
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [type, setType] = useState<LeadActivityType>("note");
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!body.trim()) return;
    setSaving(true);
    await fetch(`/api/hub/leads/${leadId}/activities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, body }),
    });
    setBody("");
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <form onSubmit={onSubmit} className="space-y-2">
        <div className="grid gap-2 sm:grid-cols-[10rem,1fr]">
          <select
            value={type}
            onChange={(event) => setType(event.target.value as LeadActivityType)}
            className="hub-field"
          >
            {logTypes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={3}
            className="hub-field resize-y"
            placeholder="Log the conversation, call, or next step."
          />
        </div>
        <button type="submit" disabled={saving} className="hub-btn">
          {saving ? "Saving…" : "Log activity"}
        </button>
      </form>
      <ol className="space-y-3">
        {activities.length === 0 ? (
          <li className="text-sm text-zinc-500">No conversation yet.</li>
        ) : (
          activities.map((activity) => (
            <li
              key={activity.id}
              className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-sm text-zinc-300"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-indigo-300">
                {labelFor(LEAD_ACTIVITY_TYPES, activity.type)}
                {activity.from_stage && activity.to_stage
                  ? ` · ${activity.from_stage} → ${activity.to_stage}`
                  : ""}
              </p>
              {activity.body ? (
                <p className="mt-2 whitespace-pre-wrap">{activity.body}</p>
              ) : null}
              <p className="mt-2 text-xs text-zinc-500">
                {new Date(activity.occurred_at).toLocaleString()}
              </p>
            </li>
          ))
        )}
      </ol>
    </div>
  );
}
