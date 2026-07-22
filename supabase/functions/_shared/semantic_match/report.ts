/**
 * Stage 5 — Assemble explainable semantic match report.
 */

import {
  computeOverallMatchPercent,
  scoreSemanticCategories,
  topStrengths,
  topWeaknesses,
} from "./score.ts";
import { partitionMatches } from "./report_utils.ts";
import type {
  CanonicalProfile,
  CompetencyMatchResult,
  SemanticMatchReport,
} from "./types.ts";
import type { MatchScoreWeights } from "../match_score_weights.ts";

export function buildSemanticMatchReport(
  matches: CompetencyMatchResult[],
  resume: CanonicalProfile,
  job: CanonicalProfile,
  weightOverrides?: Partial<MatchScoreWeights> | null,
): SemanticMatchReport {
  const categoryScores = scoreSemanticCategories(
    matches,
    resume,
    job,
    weightOverrides,
  );
  const overallMatchPercent = computeOverallMatchPercent(categoryScores);
  const { matched, partial, missing } = partitionMatches(matches);

  const strengths = topStrengths(matches);
  const weaknesses = topWeaknesses(matches);

  const scoreReasoning = [
    `Overall match ${overallMatchPercent}% from weighted categories:`,
    ...categoryScores.map(
      (c) =>
        `${c.label} ${c.score}% (weight ${c.weight}% → +${c.contribution})`,
    ),
    strengths.length
      ? `Strengths: ${strengths.slice(0, 3).join("; ")}.`
      : "Limited strong competency overlap.",
    weaknesses.length
      ? `Gaps: ${weaknesses.slice(0, 3).join("; ")}.`
      : "No major required competency gaps detected.",
  ].join(" ");

  return {
    overallMatchPercent,
    categoryScores,
    matchedCompetencies: matched,
    partialCompetencies: partial,
    missingCompetencies: missing,
    strengths,
    weaknesses,
    scoreReasoning,
    resumeCanonical: resume,
    jobCanonical: job,
  };
}
