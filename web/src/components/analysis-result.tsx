"use client";

import { useEffect, useState } from "react";
import { QualificationBreakdown } from "@/components/qualification-breakdown";
import { ReportSummaryHeader } from "@/components/report-summary-header";
import {
  ReportRevealProvider,
  ReportRevealSection,
} from "@/components/report-reveal-section";
import { reportRoleTitle } from "@/lib/analysis-report-cache";
import { loadLocalProfilePrefs } from "@/lib/local-profile-prefs";
import {
  matchScoreWeightsFromProfile,
  resolveMatchScoreWeightProfileLabel,
  type MatchScoreWeights,
} from "@/lib/match-score-weights";
import { normalizeAnalysisResult } from "@/lib/normalize-score";
import { fetchUserProfile } from "@/lib/profile";
import { withMatchScoreWeights } from "@/lib/semantic-report";
import type { AnalysisResult, Compensation } from "@/lib/types";

function resolveWeightProfileLabel(
  weights: MatchScoreWeights,
  customs: Parameters<typeof resolveMatchScoreWeightProfileLabel>[1] = [],
  savedLabel?: string | null,
): string {
  if (savedLabel?.trim()) return savedLabel.trim();
  return resolveMatchScoreWeightProfileLabel(weights, customs);
}

export function AnalysisResultView({
  result,
  matchScoreWeights: savedMatchScoreWeights = null,
  matchScoreWeightProfileLabel: savedWeightProfileLabel = null,
  profileDesiredCompensation = null,
  profileQualifiedIndustries = null,
  profileQualifiedSkills = null,
  profileCountry = null,
  profileTimezone = null,
  profilePreferredCompanyTypes = null,
  profilePreferredMinimumEmployerRating = null,
  profilePreferredRegions = null,
  profilePreferredProjectTypes = null,
  profileMinimumHourlyRate = null,
  showSummaryHeader = true,
}: {
  result: AnalysisResult;
  analysisId?: string | null;
  reportId?: string | null;
  resumeId?: string | null;
  matchScoreWeights?: MatchScoreWeights | null;
  matchScoreWeightProfileLabel?: string | null;
  profileDesiredCompensation?: Compensation | null;
  profileQualifiedIndustries?: string[] | null;
  profileQualifiedSkills?: string[] | null;
  profileCountry?: string | null;
  profileTimezone?: string | null;
  profilePreferredCompanyTypes?: string[] | null;
  profilePreferredMinimumEmployerRating?: number | null;
  profilePreferredRegions?: string[] | null;
  profilePreferredProjectTypes?: string[] | null;
  profileMinimumHourlyRate?: number | null;
  showSummaryHeader?: boolean;
}) {
  const initialWeights = matchScoreWeightsFromProfile(
    savedMatchScoreWeights ??
      loadLocalProfilePrefs()?.matchScoreWeights ??
      null,
  );
  const [weights, setWeights] = useState<MatchScoreWeights>(initialWeights);
  const [weightProfileLabel, setWeightProfileLabel] = useState(() =>
    resolveWeightProfileLabel(
      initialWeights,
      loadLocalProfilePrefs()?.matchScoreCustomPresets ?? [],
      savedWeightProfileLabel,
    ),
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const localCustoms =
        loadLocalProfilePrefs()?.matchScoreCustomPresets ?? [];

      if (savedMatchScoreWeights) {
        const next = matchScoreWeightsFromProfile(savedMatchScoreWeights);
        setWeights(next);
        setWeightProfileLabel(
          resolveWeightProfileLabel(next, localCustoms, savedWeightProfileLabel),
        );
        return;
      }

      const profile = await fetchUserProfile();
      if (cancelled) return;
      const customs = profile?.matchScoreCustomPresets ?? localCustoms;
      const next = matchScoreWeightsFromProfile(
        profile?.matchScoreWeights ??
          loadLocalProfilePrefs()?.matchScoreWeights ??
          null,
      );
      setWeights(next);
      setWeightProfileLabel(
        resolveWeightProfileLabel(next, customs, savedWeightProfileLabel),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [savedMatchScoreWeights, savedWeightProfileLabel]);

  const normalized = normalizeAnalysisResult(result, {
    profileDesiredCompensation,
    profileQualifiedIndustries,
    profileQualifiedSkills,
    profileCountry,
    profileTimezone,
  });
  const jobDescription =
    normalized.jobDescription ?? result.jobDescription ?? null;
  const score = withMatchScoreWeights(normalized.score, weights);
  const { postingContext, parsedJob, parsedResume, narrative } = normalized;
  const displayJobTitle = reportRoleTitle({
    ...result,
    jobDescription,
    parsedJob,
  });

  return (
    <ReportRevealProvider>
      <div className="space-y-6">
        <div className="space-y-4">
          {showSummaryHeader ? (
            <ReportRevealSection>
              <ReportSummaryHeader jobTitle={displayJobTitle} />
            </ReportRevealSection>
          ) : null}
          <QualificationBreakdown
            score={score}
            narrative={narrative}
            postingContext={postingContext}
            jobDescription={jobDescription}
            parsedJob={parsedJob}
            parsedResume={parsedResume}
            jobTitle={displayJobTitle}
            companyName={result.companyName}
            weightProfileLabel={weightProfileLabel}
            profileDesiredCompensation={profileDesiredCompensation}
            profileQualifiedIndustries={profileQualifiedIndustries}
            profileQualifiedSkills={profileQualifiedSkills}
            profileCountry={profileCountry}
            profileTimezone={profileTimezone}
            profilePreferredCompanyTypes={profilePreferredCompanyTypes}
            profilePreferredMinimumEmployerRating={
              profilePreferredMinimumEmployerRating
            }
            profilePreferredRegions={profilePreferredRegions}
            profilePreferredProjectTypes={profilePreferredProjectTypes}
            profileMinimumHourlyRate={profileMinimumHourlyRate}
          />
        </div>
      </div>
    </ReportRevealProvider>
  );
}
