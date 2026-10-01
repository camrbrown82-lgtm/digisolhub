import { metaAdAccountId } from "@/lib/meta/config";
import { lookalikeForCountry, type LookalikeStatus } from "@/lib/meta/audiences";
import { metaGraph } from "@/lib/meta/graph";

/** Placements only. These do not change cities, ages, budget, or the approved poster and copy. */
const APPLY_TYPES = new Set(["AUTOMATIC_PLACEMENTS", "PERFORMANT_CREATIVE_REELS_OPT_IN"]);

const APPLY_LABEL: Record<string, string> = {
  AUTOMATIC_PLACEMENTS: "Automatic placements",
  PERFORMANT_CREATIVE_REELS_OPT_IN: "Reels placements",
};

const HOLD_REASON: Record<string, string> = {
  ADVANTAGE_PLUS_AUDIENCE: "It would let Meta go outside the cities and ages on the ad.",
  SCALE_GOOD_CAMPAIGN: "It would raise the daily budget past the cap you set.",
  BUDGET_LIMITED: "It would raise the daily budget past the cap you set.",
};

export type HeldRecommendation = { title: string; reason: string };

export type OpportunityStatus = {
  score: number | null;
  error?: string;
  applied: string[];
  held: HeldRecommendation[];
  leftInAdsManager: number;
  lookalike: LookalikeStatus;
};

type Recommendation = {
  recommendation_signature?: string;
  type?: string;
  recommendation_content?: { body?: string };
};

function recommendationList(payload: { data?: unknown }): Recommendation[] {
  if (!Array.isArray(payload.data)) return [];
  const out: Recommendation[] = [];
  for (const item of payload.data) {
    if (!item || typeof item !== "object") continue;
    const nested = (item as { recommendations?: Recommendation[] }).recommendations;
    if (Array.isArray(nested)) out.push(...nested);
    else if ("type" in item || "recommendation_signature" in item) out.push(item as Recommendation);
  }
  return out;
}

export function emptyOpportunity(): OpportunityStatus {
  return {
    score: null,
    applied: [],
    held: [],
    leftInAdsManager: 0,
    lookalike: {
      audienceId: null,
      country: "CA",
      seedCount: null,
      note: "",
    },
  };
}

/** Turns on placement recommendations. Cities, ages, budget, and the approved creative stay as they are. */
export async function applyPlacementRecommendations() {
  const account = metaAdAccountId();
  const applied = new Set<string>();
  const held = new Map<string, string>();
  let left = 0;
  if (!account) return { applied: [] as string[], held: [] as HeldRecommendation[], leftInAdsManager: 0 };

  const payload = await metaGraph<{ data?: unknown }>("GET", `${account}/recommendations`, {
    fields: "recommendation_signature,type,recommendation_content",
    limit: 50,
  });
  let attempts = 0;
  for (const recommendation of recommendationList(payload)) {
    const type = recommendation.type || "";
    if (APPLY_TYPES.has(type) && recommendation.recommendation_signature && attempts < 8) {
      attempts += 1;
      try {
        await metaGraph("POST", `${account}/recommendations`, {
          recommendation_signature: recommendation.recommendation_signature,
          extra_data: {},
        });
        applied.add(APPLY_LABEL[type] || type);
      } catch {
        left += 1;
      }
      continue;
    }
    const reason = HOLD_REASON[type];
    if (reason) {
      held.set(type, reason);
      continue;
    }
    if (type) left += 1;
  }

  return {
    applied: Array.from(applied),
    held: Array.from(held.entries()).map(([type, reason]) => ({
      title: type === "ADVANTAGE_PLUS_AUDIENCE" ? "Advantage+ audience" : "Budget increase",
      reason,
    })),
    leftInAdsManager: left,
  };
}

/** Reads the account score, applies placement recommendations, and prepares the Canada lookalike. */
export async function opportunityStatus(country = "CA"): Promise<OpportunityStatus> {
  const status = emptyOpportunity();
  const account = metaAdAccountId();
  if (!account) {
    status.error = "META_AD_ACCOUNT_ID is not set.";
    return status;
  }

  const [scoreResult, lookalike] = await Promise.all([
    metaGraph<{ opportunity_score?: number | string }>("GET", account, { fields: "opportunity_score" }).then(
      (row) => {
        const score = Number(row.opportunity_score);
        return Number.isFinite(score) ? score : null;
      },
      (error: unknown) => error,
    ),
    lookalikeForCountry(country).catch((error: unknown) => ({
      audienceId: null,
      country,
      seedCount: null,
      note: error instanceof Error ? error.message : "Lookalike could not be checked.",
    })),
  ]);

  status.lookalike = lookalike;
  if (typeof scoreResult === "number" || scoreResult === null) status.score = scoreResult;
  else status.error = scoreResult instanceof Error ? scoreResult.message : "Opportunity score could not be read.";

  try {
    const placed = await applyPlacementRecommendations();
    status.applied = placed.applied;
    status.held = placed.held;
    status.leftInAdsManager = placed.leftInAdsManager;
  } catch (error) {
    status.error = status.error || (error instanceof Error ? error.message : "Recommendations could not be applied.");
  }
  return status;
}
