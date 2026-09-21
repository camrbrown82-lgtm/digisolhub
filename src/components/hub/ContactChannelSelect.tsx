"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  CAMPAIGN_CHANNELS,
  CAMPAIGN_CHANNEL_LABELS,
  type CampaignChannel,
  campaignChannelLabel,
} from "@/lib/campaignChannels";

export function ContactChannelSelect({
  contactId,
  value,
  compact = false,
}: {
  contactId: string;
  value: string | null;
  compact?: boolean;
}) {
  const router = useRouter();
  const [channel, setChannel] = useState(value || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setChannel(value || "");
  }, [value]);

  async function onChange(next: string) {
    const previous = channel;
    setChannel(next);
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/hub/contacts/${contactId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaign_channel: next || null,
        }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) {
        setChannel(previous);
        setError(result.error || "Could not save channel");
        return;
      }
      router.refresh();
    } catch {
      setChannel(previous);
      setError("Could not save channel");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={compact ? "space-y-1" : "space-y-1.5"}>
      <select
        value={channel}
        disabled={busy}
        onChange={(event) => void onChange(event.target.value)}
        className={
          compact ? "hub-field max-w-[11rem] py-1 text-xs" : "hub-field"
        }
        aria-label={`Campaign channel${value ? `: ${campaignChannelLabel(value)}` : ""}`}
        title="Marketing campaign type"
      >
        <option value="">Unset</option>
        {CAMPAIGN_CHANNELS.map((item) => (
          <option key={item} value={item}>
            {CAMPAIGN_CHANNEL_LABELS[item as CampaignChannel]}
          </option>
        ))}
      </select>
      {error ? (
        <p className="max-w-[11rem] text-[11px] text-rose-400">{error}</p>
      ) : null}
    </div>
  );
}
