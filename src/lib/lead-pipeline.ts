export const LEAD_STAGES = [
  { id: "new", label: "New" },
  { id: "contacted", label: "Contacted" },
  { id: "qualified", label: "Qualified" },
  { id: "meeting", label: "Meeting" },
  { id: "proposal", label: "Proposal" },
  { id: "won", label: "Won" },
  { id: "lost", label: "Lost" },
] as const;

export const LEAD_SOURCES = [
  { id: "door_to_door", label: "Door to door" },
  { id: "networking", label: "Networking" },
  { id: "event", label: "Event / booth" },
  { id: "referral", label: "Referral" },
  { id: "cold_call", label: "Cold call" },
  { id: "walk_in", label: "Walk-in" },
  { id: "website", label: "Website" },
  { id: "facebook", label: "Facebook / Meta" },
  { id: "other", label: "Other" },
] as const;

export const LEAD_CHANNELS = [
  { id: "in_person", label: "In person" },
  { id: "phone", label: "Phone" },
  { id: "email", label: "Email" },
  { id: "social", label: "Social" },
  { id: "web", label: "Web" },
  { id: "facebook", label: "Facebook" },
  { id: "other", label: "Other" },
] as const;

export const LEAD_ACTIVITY_TYPES = [
  { id: "created", label: "Created" },
  { id: "note", label: "Note" },
  { id: "call", label: "Call" },
  { id: "meeting", label: "Meeting" },
  { id: "email", label: "Email" },
  { id: "follow_up", label: "Follow-up" },
  { id: "stage_change", label: "Stage change" },
  { id: "won", label: "Won" },
  { id: "lost", label: "Lost" },
] as const;

export type LeadStage = (typeof LEAD_STAGES)[number]["id"];
export type LeadSource = (typeof LEAD_SOURCES)[number]["id"];
export type LeadChannel = (typeof LEAD_CHANNELS)[number]["id"];
export type LeadActivityType = (typeof LEAD_ACTIVITY_TYPES)[number]["id"];

export type LeadRecord = {
  id: string;
  client_id: string | null;
  contact_id: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  service: string | null;
  source: string;
  channel: string;
  location: string | null;
  campaign: string | null;
  stage: string;
  estimated_value: number | string | null;
  actual_value: number | string | null;
  lost_reason: string | null;
  next_follow_up_at: string | null;
  first_touch_at: string;
  last_touch_at: string;
  closed_at: string | null;
  notes_preview: string | null;
  created_at: string;
};

export function isLeadStage(value: string): value is LeadStage {
  return LEAD_STAGES.some((stage) => stage.id === value);
}

export function isLeadSource(value: string): value is LeadSource {
  return LEAD_SOURCES.some((source) => source.id === value);
}

export function isLeadChannel(value: string): value is LeadChannel {
  return LEAD_CHANNELS.some((channel) => channel.id === value);
}

export function isLeadActivityType(value: string): value is LeadActivityType {
  return LEAD_ACTIVITY_TYPES.some((type) => type.id === value);
}

export function labelFor<T extends { id: string; label: string }>(
  items: readonly T[],
  id: string,
) {
  return items.find((item) => item.id === id)?.label ?? id;
}

function money(value: number | string | null | undefined) {
  const n = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(n) ? Number(n) : 0;
}

export function summarizeLeadPerformance(leads: LeadRecord[]) {
  const byStage = Object.fromEntries(LEAD_STAGES.map((stage) => [stage.id, 0])) as Record<
    LeadStage,
    number
  >;
  const bySource = LEAD_SOURCES.map((source) => ({
    id: source.id,
    label: source.label,
    count: 0,
    won: 0,
    lost: 0,
    pipelineValue: 0,
    wonValue: 0,
  }));

  let open = 0;
  let won = 0;
  let lost = 0;
  let pipelineValue = 0;
  let wonValue = 0;
  let closeDaysTotal = 0;
  let closeCount = 0;

  for (const lead of leads) {
    const stage = isLeadStage(lead.stage) ? lead.stage : "new";
    byStage[stage] += 1;
    const sourceRow = bySource.find((row) => row.id === lead.source);
    if (sourceRow) sourceRow.count += 1;

    const estimate = money(lead.estimated_value);
    const actual = money(lead.actual_value);

    if (stage === "won") {
      won += 1;
      wonValue += actual || estimate;
      if (sourceRow) {
        sourceRow.won += 1;
        sourceRow.wonValue += actual || estimate;
      }
      if (lead.closed_at && lead.first_touch_at) {
        const days =
          (new Date(lead.closed_at).getTime() - new Date(lead.first_touch_at).getTime()) /
          86400000;
        if (Number.isFinite(days) && days >= 0) {
          closeDaysTotal += days;
          closeCount += 1;
        }
      }
    } else if (stage === "lost") {
      lost += 1;
      if (sourceRow) sourceRow.lost += 1;
    } else {
      open += 1;
      pipelineValue += estimate;
      if (sourceRow) sourceRow.pipelineValue += estimate;
    }
  }

  const closed = won + lost;
  return {
    total: leads.length,
    open,
    won,
    lost,
    winRate: closed === 0 ? 0 : Math.round((won / closed) * 100),
    pipelineValue,
    wonValue,
    avgDaysToClose: closeCount === 0 ? 0 : Math.round(closeDaysTotal / closeCount),
    byStage,
    bySource: bySource.filter((row) => row.count > 0),
  };
}

export function leadDisplayName(lead: {
  name?: string | null;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
}) {
  return lead.name || lead.company || lead.email || lead.phone || "Untitled lead";
}
