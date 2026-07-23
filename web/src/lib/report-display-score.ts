import type { AnalysisReportCacheEntry } from "@/lib/analysis-report-cache";
import { buildOverallMatchRollups } from "@/lib/opportunity-categories";
import {
  buildSemanticCategoryRollups,
  getSemanticReport,
  withMatchScoreWeights,
} from "@/lib/semantic-report";
import { loadLocalProfilePrefs } from "@/lib/local-profile-prefs";
import { matchScoreWeightsFromProfile } from "@/lib/match-score-weights";
import { normalizeAnalysisResult } from "@/lib/normalize-score";
import { resolveReportFitScore } from "@/lib/report-fit-score";
import {
  resolveReportMinimumHourlyRate,
  resolveReportPreferredCompanyTypes,
  resolveReportPreferredMinimumEmployerRating,
  resolveReportPreferredProjectTypes,
  resolveReportPreferredRegions,
} from "@/lib/report-profile-prefs";
import { buildReportRollupOptions } from "@/lib/report-rollup-context";
import type { ReportRollupOptions } from "@/lib/section-score-rollups";
import type { ScoreResult } from "@/lib/types";

export function resolveReportRollupContextFromCacheEntry(
  entry: AnalysisReportCacheEntry,
): { score: ScoreResult; rollupOptions: ReportRollupOptions } {
  const local = loadLocalProfilePrefs();

  const profileDesiredCompensation = entry.profileDesiredCompensation ?? null;
  const profileQualifiedIndustries = entry.profileQualifiedIndustries ?? null;
  const profileQualifiedSkills = entry.profileQualifiedSkills ?? null;
  const profileCountry = entry.profileCountry ?? null;
  const profileTimezone = entry.profileTimezone ?? null;

  const normalized = normalizeAnalysisResult(entry.result, {
    profileDesiredCompensation,
    profileQualifiedIndustries,
    profileQualifiedSkills,
    profileCountry,
    profileTimezone,
  });

  // Same weight overlay as AnalysisResultView / the report ring so Recent
  // Activity and home stats match the Fit Summary score.
  const weights = matchScoreWeightsFromProfile(
    entry.matchScoreWeights ?? local?.matchScoreWeights ?? null,
  );
  const score = withMatchScoreWeights(normalized.score, weights);

  const rollupOptions = buildReportRollupOptions({
    score,
    parsedJob: normalized.parsedJob,
    parsedResume: normalized.parsedResume,
    profileDesiredCompensation,
    profileQualifiedIndustries,
    profileQualifiedSkills,
    profileCountry,
    profileTimezone,
    profilePreferredCompanyTypes: resolveReportPreferredCompanyTypes(
      local?.preferredCompanyTypes,
      entry,
    ),
    profilePreferredMinimumEmployerRating:
      resolveReportPreferredMinimumEmployerRating(
        local?.preferredMinimumEmployerRating,
        entry,
      ),
    profilePreferredRegions: resolveReportPreferredRegions(
      local?.preferredRegions,
      entry,
    ),
    profilePreferredProjectTypes: resolveReportPreferredProjectTypes(
      local?.preferredProjectTypes,
      entry,
    ),
    profileMinimumHourlyRate: resolveReportMinimumHourlyRate(
      local?.minimumHourlyRate,
      entry,
    ),
    jobDescription: normalized.jobDescription,
    jobTitle: normalized.jobTitle,
    companyName: normalized.companyName,
    postingContext: normalized.postingContext,
  });

  return { score, rollupOptions };
}

/** Same Overall Match category rows as the fit report summary card. */
export function resolveOverallMatchRollupsFromCacheEntry(
  entry: AnalysisReportCacheEntry,
) {
  const { score, rollupOptions } =
    resolveReportRollupContextFromCacheEntry(entry);
  const semantic = getSemanticReport(score);
  if (semantic) {
    return buildSemanticCategoryRollups(semantic);
  }
  return buildOverallMatchRollups(score, rollupOptions);
}

/** Same global fit score (0–100) as the report summary ring. */
export function resolveReportFitScoreFromCacheEntry(
  entry: AnalysisReportCacheEntry,
): number {
  const { score, rollupOptions } =
    resolveReportRollupContextFromCacheEntry(entry);
  return resolveReportFitScore(score, rollupOptions);
}
