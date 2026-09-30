import type { MetaCampaignInsight } from "@/lib/meta/insights";

export type AdAdvice = {
  campaignId: string;
  campaignName: string;
  action: "pause" | "refresh" | "scale" | "review";
  severity: 1 | 2 | 3;
  message: string;
};

const ACTION_LABEL: Record<AdAdvice["action"], string> = {
  pause: "Pause",
  refresh: "New creative",
  scale: "Scale up",
  review: "Review",
};

export function adviceLabel(action: AdAdvice["action"]) {
  return ACTION_LABEL[action];
}

/**
 * Plain rules over the last sync: money with no leads, weak click-through, and cost per lead well above or
 * below the account's average. Deterministic so the same numbers always give the same advice.
 */
export function coachCampaigns(campaigns: MetaCampaignInsight[], money: (value: number) => string): AdAdvice[] {
  const spend = campaigns.reduce((sum, c) => sum + c.spend, 0);
  const leads = campaigns.reduce((sum, c) => sum + c.leads, 0);
  const avgCpl = leads > 0 ? spend / leads : null;
  const noLeadLimit = Math.max(40, avgCpl ? avgCpl * 2 : 0);
  const advice: AdAdvice[] = [];

  for (const c of campaigns) {
    if (c.spend <= 0) continue;
    const base = { campaignId: c.campaignId, campaignName: c.campaignName };
    if (c.leads === 0 && c.spend >= noLeadLimit) {
      advice.push({
        ...base,
        action: "pause",
        severity: 3,
        message: `Spent ${money(c.spend)} with no leads. Pause it, or change the offer before spending more.`,
      });
      continue;
    }
    if (avgCpl && c.leads >= 3 && c.cpl != null && c.cpl <= avgCpl * 0.7) {
      advice.push({
        ...base,
        action: "scale",
        severity: 2,
        message: `Leads at ${money(c.cpl)} each, well under the ${money(avgCpl)} average. Raise the budget about 20%.`,
      });
    } else if (avgCpl && c.leads >= 2 && c.cpl != null && c.cpl >= avgCpl * 1.5) {
      advice.push({
        ...base,
        action: "review",
        severity: 2,
        message: `Leads cost ${money(c.cpl)}, well over the ${money(avgCpl)} average. Tighten the audience or try a new poster.`,
      });
    }
    if (c.impressions >= 1000 && c.ctr > 0 && c.ctr < 0.8) {
      advice.push({
        ...base,
        action: "refresh",
        severity: 1,
        message: `Only ${c.ctr.toFixed(2)}% of people click. Try a new poster or a sharper headline.`,
      });
    }
  }
  return advice.sort((a, b) => b.severity - a.severity);
}
