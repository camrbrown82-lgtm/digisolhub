export const CAMPAIGN_CHANNELS = [
  "email",
  "cold_call",
  "door_to_door",
] as const;

export type CampaignChannel = (typeof CAMPAIGN_CHANNELS)[number];

export const CAMPAIGN_CHANNEL_LABELS: Record<CampaignChannel, string> = {
  email: "Email marketing",
  cold_call: "Cold calls",
  door_to_door: "Door to door",
};

const ALIASES: Record<string, CampaignChannel> = {
  email: "email",
  email_marketing: "email",
  emails: "email",
  mail: "email",
  cold_call: "cold_call",
  cold_calls: "cold_call",
  coldcall: "cold_call",
  phone: "cold_call",
  call: "cold_call",
  calls: "cold_call",
  door_to_door: "door_to_door",
  door_to_doors: "door_to_door",
  doortodoor: "door_to_door",
  door: "door_to_door",
  knocks: "door_to_door",
  canvass: "door_to_door",
};

export function isCampaignChannel(value: string): value is CampaignChannel {
  return CAMPAIGN_CHANNELS.includes(value as CampaignChannel);
}

/** Normalize free-text / CSV values to a campaign channel, or null if unknown/empty. */
export function normalizeCampaignChannel(
  value: string | null | undefined,
): CampaignChannel | null {
  if (!value?.trim()) return null;
  const key = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
  if (isCampaignChannel(key)) return key;
  return ALIASES[key] ?? null;
}

export function campaignChannelLabel(
  value: string | null | undefined,
): string {
  const channel = normalizeCampaignChannel(value);
  return channel ? CAMPAIGN_CHANNEL_LABELS[channel] : "—";
}
