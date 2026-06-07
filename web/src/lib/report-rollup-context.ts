import type { PostingDetailHighlightContext } from "@/lib/posting-detail-highlights";
import {
  enrichParsedJobForPostingDetails,
  resolvePostingDetailRows,
} from "@/lib/posting-details";
import type { ReportRollupOptions } from "@/lib/section-score-rollups";
import type { SectionFieldScoreContext } from "@/lib/section-field-scoring";
import type {
  CategoryScore,
  Compensation,
  ParsedJob,
  ParsedResume,
  ScoreResult,
} from "@/lib/types";

export function buildReportRollupOptions({
  score,
  parsedJob,
  parsedResume,
  profileDesiredCompensation,
  profileQualifiedIndustries,
  profileQualifiedSkills,
  profileCountry,
  profileTimezone,
  jobDescription,
  jobTitle,
}: {
  score: ScoreResult;
  parsedJob?: ParsedJob;
  parsedResume?: ParsedResume | null;
  profileDesiredCompensation?: Compensation | null;
  profileQualifiedIndustries?: string[] | null;
  profileQualifiedSkills?: string[] | null;
  profileCountry?: string | null;
  profileTimezone?: string | null;
  jobDescription?: string | null;
  jobTitle?: string | null;
}): ReportRollupOptions {
  const highlightCtx: PostingDetailHighlightContext = {
    profileDesiredCompensation,
    parsedResume,
    parsedJob,
    jobTitle,
  };

  const enriched = parsedJob
    ? enrichParsedJobForPostingDetails(parsedJob, { jobDescription, jobTitle })
    : undefined;

  const postingRows = enriched
    ? resolvePostingDetailRows(enriched, { jobDescription, jobTitle })
    : [];

  const fieldContext: SectionFieldScoreContext = {
    parsedJob: enriched ?? parsedJob,
    parsedResume,
    profileDesiredCompensation,
    profileQualifiedIndustries,
    profileQualifiedSkills,
    profileCountry,
    profileTimezone,
    jobDescription,
    jobTitle,
    breakdown: score.categoryBreakdown,
    isGuest: score.scoringMode === "guest",
  };

  return { fieldContext, postingRows, highlightCtx };
}
