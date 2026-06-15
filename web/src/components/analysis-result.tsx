"use client";

import { QualificationBreakdown } from "@/components/qualification-breakdown";
import { ReportJobTitleMeta } from "@/components/report-job-title-meta";
import {
  ReportRevealProvider,
  ReportRevealSection,
} from "@/components/report-reveal-section";
import { reportRoleTitle } from "@/lib/analysis-report-cache";
import { normalizeAnalysisResult } from "@/lib/normalize-score";
import type { AnalysisResult, Compensation } from "@/lib/types";

export function AnalysisResultView({
  result,
  analysisId = null,
  profileDesiredCompensation = null,
  profileQualifiedIndustries = null,
  profileQualifiedSkills = null,
  profileCountry = null,
  profileTimezone = null,
  profilePreferredCompanyTypes = null,
  profilePreferredMinimumEmployerRating = null,
  profilePreferredRegions = null,
  profileMinimumHourlyRate = null,
}: {
  result: AnalysisResult;
  analysisId?: string | null;
  profileDesiredCompensation?: Compensation | null;
  profileQualifiedIndustries?: string[] | null;
  profileQualifiedSkills?: string[] | null;
  profileCountry?: string | null;
  profileTimezone?: string | null;
  profilePreferredCompanyTypes?: string[] | null;
  profilePreferredMinimumEmployerRating?: number | null;
  profilePreferredRegions?: string[] | null;
  profileMinimumHourlyRate?: number | null;
}) {
  const normalized = normalizeAnalysisResult(result, {
    profileDesiredCompensation,
    profileQualifiedIndustries,
    profileQualifiedSkills,
    profileCountry,
    profileTimezone,
  });
  const jobDescription =
    normalized.jobDescription ?? result.jobDescription ?? null;
  const { score, postingContext, parsedJob, parsedResume } = normalized;
  const displayJobTitle = reportRoleTitle({
    ...result,
    jobDescription,
    parsedJob,
  });

  return (
    <ReportRevealProvider>
      <div className="space-y-6">
        <div className="space-y-4">
          <ReportRevealSection>
            <div className="space-y-2">
              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Job Fit Report Summary
              </p>
              <p className="text-[22px] font-semibold leading-tight tracking-tight text-foreground">
                {displayJobTitle}
              </p>
              <ReportJobTitleMeta
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
                profileMinimumHourlyRate={profileMinimumHourlyRate}
                jobDescription={jobDescription}
                jobTitle={displayJobTitle}
                companyName={result.companyName}
                postingContext={postingContext}
              />
            </div>
          </ReportRevealSection>
          <QualificationBreakdown
            score={score}
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
            profileMinimumHourlyRate={profileMinimumHourlyRate}
          />
        </div>
      </div>
    </ReportRevealProvider>
  );
}
