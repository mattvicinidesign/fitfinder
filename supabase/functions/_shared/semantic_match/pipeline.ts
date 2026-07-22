/**
 * Semantic matching pipeline orchestrator.
 * Resume + job text → extract → normalize → match → score → report.
 */

import { extractJobStructure, extractResumeStructure } from "./extract.ts";
import { matchCanonicalProfiles } from "./match.ts";
import { normalizeProfiles } from "./normalize.ts";
import { buildSemanticMatchReport } from "./report.ts";
import type { SemanticMatchReport } from "./types.ts";
import type { MatchScoreWeights } from "../match_score_weights.ts";

export interface SemanticPipelineOptions {
  jobTitle?: string | null;
  categoryWeights?: Partial<MatchScoreWeights> | null;
}

export async function runSemanticMatchPipeline(
  resumeText: string,
  jobText: string,
  options: SemanticPipelineOptions = {},
): Promise<SemanticMatchReport> {
  const [resumeExtract, jobExtract] = await Promise.all([
    extractResumeStructure(resumeText),
    extractJobStructure(jobText, options.jobTitle),
  ]);

  const { resume: resumeCanonical, job: jobCanonical } = await normalizeProfiles(
    resumeExtract,
    jobExtract,
  );

  const matches = await matchCanonicalProfiles(resumeCanonical, jobCanonical);

  return buildSemanticMatchReport(
    matches,
    resumeCanonical,
    jobCanonical,
    options.categoryWeights,
  );
}
