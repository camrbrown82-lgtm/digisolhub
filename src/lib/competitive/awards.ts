import { AWARD_MIN_SCORE } from "@/lib/websiteAward";
import type { DimensionKey, StoredCompetitiveReport } from "@/lib/competitive/scoring";

/** Section awards use the same bar as the Excellence Award. Industry leader does not. */
export const COMPETITIVE_AWARD_MIN = AWARD_MIN_SCORE;

export type CompetitiveAwardKey = "site" | "social" | "gbp" | "leader";

export type CompetitiveAward = {
  key: CompetitiveAwardKey;
  title: string;
  /** What this award measures, shown under the title. */
  covers: string;
  score: number | null;
  earned: boolean;
  detail: string;
};

const GROUPS: Array<{
  key: Exclude<CompetitiveAwardKey, "leader">;
  title: string;
  covers: string;
  dimensions: DimensionKey[];
}> = [
  {
    key: "site",
    title: "Speed, security & SEO",
    covers: "Website experience, speed, and on-page SEO",
    dimensions: ["website", "onpage_seo"],
  },
  {
    key: "social",
    title: "Social media presence & content",
    covers: "Social profiles and content",
    dimensions: ["social", "content"],
  },
  {
    key: "gbp",
    title: "Google Business Profile",
    covers: "Local SEO and the Google Business Profile",
    dimensions: ["local_seo"],
  },
];

function dimensionScore(report: StoredCompetitiveReport, key: DimensionKey) {
  const fromCard = report.scorecard?.company.dimensions.find((d) => d.key === key)?.score;
  if (typeof fromCard === "number") return fromCard;
  const fromReport = report.dimensions.find((d) => d.key === key)?.companyScore;
  return typeof fromReport === "number" ? fromReport : null;
}

function groupScore(report: StoredCompetitiveReport, dimensions: DimensionKey[]) {
  const scores = dimensions.map((key) => dimensionScore(report, key)).filter((n): n is number => n != null);
  if (!scores.length) return null;
  return Math.round(scores.reduce((sum, n) => sum + n, 0) / scores.length);
}

function leaderAward(report: StoredCompetitiveReport): CompetitiveAward {
  const own = report.scorecard?.company.overall ?? Math.round(report.overallScore);
  const rivals = report.scorecard?.competitors ?? [];
  const best = rivals.length ? Math.max(...rivals.map((c) => c.overall)) : null;
  const earned = best != null && own >= best;
  const detail =
    best == null
      ? "This award is for the highest overall score in the analysis. Run it with competitors to award it."
      : earned
        ? `Highest overall score in this analysis, ${own} against ${best}.`
        : `A competitor scored ${best}. This company scored ${own}. The award goes to the highest overall score, not to a 90.`;
  return {
    key: "leader",
    title: "Industry leader",
    covers: "Highest overall score against the competitors in this analysis",
    score: own,
    earned,
    detail,
  };
}

/** Awards earned from one competitive analysis. Section awards need 90. Industry leader needs the top overall score. */
export function competitiveAwards(report: StoredCompetitiveReport): CompetitiveAward[] {
  const sections = GROUPS.map((group) => {
    const score = groupScore(report, group.dimensions);
    const earned = score != null && score >= COMPETITIVE_AWARD_MIN;
    return {
      key: group.key,
      title: group.title,
      covers: group.covers,
      score,
      earned,
      detail:
        score == null
          ? "This analysis does not include a score for this award yet."
          : earned
            ? `${score}/100. ${COMPETITIVE_AWARD_MIN} or higher earns it.`
            : `${score}/100. ${COMPETITIVE_AWARD_MIN} or higher earns it.`,
    };
  });
  return [...sections, leaderAward(report)];
}
