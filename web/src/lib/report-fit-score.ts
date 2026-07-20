import { hasSemanticReport, resolveSemanticFitScore } from "@/lib/semantic-report";
import {
  buildOverallMatchRollups,
  computeOverallMatchFitScore,
  usesOpportunityEngine,
} from "@/lib/opportunity-categories";
import {
  computeWeightedReportScore,
  type ReportRollupOptions,
} from "@/lib/section-score-rollups";
import type { ScoreResult } from "@/lib/types";

/** Same global fit score shown on the report ring (0–100). */
export function resolveReportFitScore(
  score: ScoreResult,
  rollupOptions: ReportRollupOptions,
): number {
  if (hasSemanticReport(score)) {
    return resolveSemanticFitScore(score);
  }

  const rollups = buildOverallMatchRollups(score, rollupOptions);
  const rollupFitScore = computeOverallMatchFitScore(rollups);
  const engineActive = usesOpportunityEngine(score);
  const isGuest = score.scoringMode === "guest";

  return (
    rollupFitScore ??
    (engineActive
      ? score.fitScore
      : (computeWeightedReportScore(
          score.categoryBreakdown,
          isGuest,
          rollupOptions,
        ) ?? score.fitScore))
  );
}
