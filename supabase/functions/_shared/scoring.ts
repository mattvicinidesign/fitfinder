// Semantic matching engine entry point — scoreFit runs the resume + job pipeline.

import { buildScoreResultFromSemanticReport } from "./semantic_match/score_result.ts";
import { runSemanticMatchPipeline } from "./semantic_match/pipeline.ts";
import type { PostingContext } from "./posting_context.ts";
import type { ScoreResult } from "./types.ts";
import type { ScoringMode } from "./scoring_constants.ts";
import type { MatchScoreWeights } from "./match_score_weights.ts";

export type { ScoringMode };

export interface ScoreFitOptions {
  mode?: ScoringMode;
  jobTitle?: string | null;
  jobText?: string | null;
  resumeText?: string | null;
  posting?: PostingContext | null;
  categoryWeights?: Partial<MatchScoreWeights> | null;
}

export async function scoreFit(
  resumeText: string,
  jobText: string,
  options: ScoreFitOptions = {},
): Promise<ScoreResult> {
  const trimmedResume = resumeText.trim();
  const trimmedJob = (options.jobText ?? jobText).trim();

  if (!trimmedResume || !trimmedJob) {
    throw new Error("Resume text and job description are required for scoring.");
  }

  const report = await runSemanticMatchPipeline(trimmedResume, trimmedJob, {
    jobTitle: options.jobTitle,
    categoryWeights: options.categoryWeights,
  });

  return buildScoreResultFromSemanticReport(report, options.mode ?? "registered");
}
