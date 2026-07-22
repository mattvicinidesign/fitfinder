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
  type MatchScoreWeights,
} from "@/lib/match-score-weights";
import { fetchUserProfile } from "@/lib/profile";
import { normalizeAnalysisResult } from "@/lib/normalize-score";
import { withMatchScoreWeights } from "@/lib/semantic-report";
import type { AnalysisResult, Compensation } from "@/lib/types";

function readCachedMatchScoreWeights(): MatchScoreWeights {
  return matchScoreWeightsFromProfile(
    loadLocalProfilePrefs()?.matchScoreWeights ?? null,
  );
}

export function AnalysisResultView({
  result,
  analysisId = null,
  reportId = null,
  resumeId = null,
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
  /** Stable key for caching the generated proposal; falls back to analysisId. */
  reportId?: string | null;
  resumeId?: string | null;
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
  const [matchScoreWeights, setMatchScoreWeights] = useState(
    readCachedMatchScoreWeights,
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const profile = await fetchUserProfile();
      if (cancelled) return;
      setMatchScoreWeights(
        matchScoreWeightsFromProfile(
          profile?.matchScoreWeights ??
            loadLocalProfilePrefs()?.matchScoreWeights ??
            null,
        ),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const normalized = normalizeAnalysisResult(result, {
    profileDesiredCompensation,
    profileQualifiedIndustries,
    profileQualifiedSkills,
    profileCountry,
    profileTimezone,
  });
  const jobDescription =
    normalized.jobDescription ?? result.jobDescription ?? null;
  const score = withMatchScoreWeights(normalized.score, matchScoreWeights);
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
              <ReportSummaryHeader
                jobTitle={displayJobTitle}
                score={score}
                parsedJob={parsedJob}
                parsedResume={parsedResume}
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
                jobDescription={jobDescription}
                companyName={result.companyName}
                postingContext={postingContext}
              />
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
