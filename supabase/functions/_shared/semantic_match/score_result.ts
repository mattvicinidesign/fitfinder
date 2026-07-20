/**
 * Build ScoreResult from a semantic match report — no legacy opportunity mapping.
 */

import { OPPORTUNITY_RECOMMENDATION_BANDS } from "../opportunity_engine_constants.ts";
import type { Recommendation, ScoreResult } from "../types.ts";
import type { ScoringMode } from "../scoring_constants.ts";
import type { SemanticMatchReport } from "./types.ts";

function recommend(fitScore: number): { recommendation: Recommendation; label: string } {
  for (const band of OPPORTUNITY_RECOMMENDATION_BANDS) {
    if (fitScore >= band.min) {
      return { recommendation: band.recommendation, label: band.label };
    }
  }
  return OPPORTUNITY_RECOMMENDATION_BANDS[OPPORTUNITY_RECOMMENDATION_BANDS.length - 1];
}

export function buildScoreResultFromSemanticReport(
  report: SemanticMatchReport,
  mode: ScoringMode = "registered",
): ScoreResult {
  const fitScore = report.overallMatchPercent;
  const { recommendation, label: recommendationLabel } = recommend(fitScore);

  const competencies = report.categoryScores.find((c) => c.category === "skillsTools");
  const qualificationScore = competencies?.score ?? fitScore;

  const evidenceTotal = report.matchedCompetencies.reduce(
    (sum, m) => sum + m.evidenceCount,
    0,
  );
  const confidenceScore = Math.min(
    100,
    Math.round(40 + evidenceTotal * 5 + report.matchedCompetencies.length * 3),
  );

  return {
    qualificationScore,
    confidenceScore,
    careerFitAdjustment: 0,
    fitScore,
    recommendation,
    recommendationLabel,
    scoringMode: mode,
    categoryBreakdown: [],
    unknownCategories: [],
    explanation: report.scoreReasoning,
    strengths: report.strengths,
    gaps: report.weaknesses,
    positiveSignalsFound: report.strengths.slice(0, 5),
    negativeSignalsFound: report.weaknesses.slice(0, 5),
    semanticMatchReport: report,
  };
}
