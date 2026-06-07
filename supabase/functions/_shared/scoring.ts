// Opportunity Engine entry point — scoreFit delegates to scoreOpportunity.

import type { PostingContext } from "./posting_context.ts";
import type { ProfileScoringRow } from "./profile_scoring.ts";
import { scoreOpportunity } from "./opportunity_engine.ts";
export { scoreOpportunity } from "./opportunity_engine.ts";
import type { ParsedJob, ParsedResume, ScoreResult } from "./types.ts";
import type { ScoringMode } from "./scoring_constants.ts";

export type { ScoringMode };

export interface ScoreFitOptions {
  mode?: ScoringMode;
  jobTitle?: string | null;
  jobText?: string | null;
  posting?: PostingContext | null;
  profile?: ProfileScoringRow | null;
}

export function scoreFit(
  resume: ParsedResume,
  job: ParsedJob,
  options: ScoreFitOptions = {},
): ScoreResult {
  return scoreOpportunity(resume, job, {
    mode: options.mode,
    jobTitle: options.jobTitle,
    jobText: options.jobText,
    posting: options.posting,
    profile: options.profile,
  });
}
