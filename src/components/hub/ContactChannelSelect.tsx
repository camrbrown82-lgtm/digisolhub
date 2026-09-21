"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
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

  async function onChange(next: string) {
    setChannel(next);
    setBusy(true);
    try {
      const response = await fetch(`/api/hub/contacts/${contactId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaign_channel: next || null,
        }),
      });
      if (!response.ok) {
        setChannel(value || "");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <select
      value={channel}
      disabled={busy}
      onChange={(event) => void onChange(event.target.value)}
      className={
        compact
          ? "hub-field max-w-[11rem] py-1 text-xs"
          : "hub-field"
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
  );
}
