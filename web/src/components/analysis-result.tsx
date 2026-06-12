"use client";

import { PostingHeaderMetaFields } from "@/components/posting-header-meta";
import { QualificationBreakdown } from "@/components/qualification-breakdown";
import {
  ReportRevealProvider,
  ReportRevealSection,
} from "@/components/report-reveal-section";
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
}: {
  result: AnalysisResult;
  analysisId?: string | null;
  profileDesiredCompensation?: Compensation | null;
  profileQualifiedIndustries?: string[] | null;
  profileQualifiedSkills?: string[] | null;
  profileCountry?: string | null;
  profileTimezone?: string | null;
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
                {result.jobTitle ?? result.parsedJob.roleTitle ?? "Job"}
              </p>
              {result.companyName?.trim() ? (
                <p className="text-[14px] text-muted-foreground">
                  {result.companyName}
                </p>
              ) : null}
              <PostingHeaderMetaFields
                parsedJob={parsedJob}
                jobDescription={jobDescription}
                jobTitle={result.jobTitle}
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
            jobTitle={result.jobTitle}
            profileDesiredCompensation={profileDesiredCompensation}
            profileQualifiedIndustries={profileQualifiedIndustries}
            profileQualifiedSkills={profileQualifiedSkills}
            profileCountry={profileCountry}
            profileTimezone={profileTimezone}
          />
        </div>
      </div>
    </ReportRevealProvider>
  );
}
