"use client";

import {
  IosGroupedRow,
  IosGroupedSection,
} from "@/components/ui/ios-grouped-section";
import { PostingHeaderMetaFields } from "@/components/posting-header-meta";
import { QualificationBreakdown } from "@/components/qualification-breakdown";
import { SaveJobButton } from "@/components/save-job-button";
import { normalizeAnalysisResult } from "@/lib/normalize-score";
import { isQaRegisteredScoring, QA_ONBOARDING_DESIRED_COMPENSATION } from "@/lib/qa";
import type { AnalysisResult, Compensation } from "@/lib/types";

export function AnalysisResultView({
  result,
  analysisId = null,
  profileDesiredCompensation = null,
  profileQualifiedIndustries = null,
  profileCountry = null,
  profileTimezone = null,
}: {
  result: AnalysisResult;
  analysisId?: string | null;
  profileDesiredCompensation?: Compensation | null;
  profileQualifiedIndustries?: string[] | null;
  profileCountry?: string | null;
  profileTimezone?: string | null;
}) {
  const compensationForMatching =
    profileDesiredCompensation ??
    (isQaRegisteredScoring() ? QA_ONBOARDING_DESIRED_COMPENSATION : null);

  const normalized = normalizeAnalysisResult(result, {
    profileDesiredCompensation: compensationForMatching,
    profileQualifiedIndustries,
    profileCountry,
    profileTimezone,
  });
  const jobDescription =
    normalized.jobDescription ?? result.jobDescription ?? null;
  const { score, postingContext, parsedJob, parsedResume } = normalized;

  return (
    <div className="space-y-6">
      <IosGroupedSection>
        <IosGroupedRow className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-2">
              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Job Fit Report Summary
              </p>
              <p className="font-[Georgia,'Times_New_Roman',serif] text-[22px] font-normal leading-tight tracking-tight text-foreground">
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
            <SaveJobButton analysisId={analysisId} />
          </div>
          <QualificationBreakdown
            score={score}
            postingContext={postingContext}
            jobDescription={jobDescription}
            parsedJob={parsedJob}
            parsedResume={parsedResume}
            jobTitle={result.jobTitle}
            profileDesiredCompensation={compensationForMatching}
            profileQualifiedIndustries={profileQualifiedIndustries}
            profileCountry={profileCountry}
            profileTimezone={profileTimezone}
          />
        </IosGroupedRow>
      </IosGroupedSection>
    </div>
  );
}
