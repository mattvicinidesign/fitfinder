"use client";

import {
  IosGroupedRow,
  IosGroupedSection,
} from "@/components/ui/ios-grouped-section";
import { QualificationBreakdown } from "@/components/qualification-breakdown";
import { SaveJobButton } from "@/components/save-job-button";
import { normalizeAnalysisResult } from "@/lib/normalize-score";
import { isQaRegisteredScoring, QA_ONBOARDING_DESIRED_COMPENSATION } from "@/lib/qa";
import type { AnalysisResult, Compensation, Narrative } from "@/lib/types";

function NarrativeList({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  if (!items?.length) return null;
  return (
    <div className="space-y-2">
      <h4 className="text-[13px] font-medium text-muted-foreground uppercase tracking-wide">
        {title}
      </h4>
      <ul className="space-y-2 text-[15px] text-foreground leading-snug">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-muted-foreground shrink-0">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

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

  const normalized = normalizeAnalysisResult(result);
  const {
    score,
    narrative,
    postingContext,
    parsedJob,
    parsedResume,
    jobDescription,
  } = normalized;

  const strengths = [...score.strengths, ...narrative.strengths];
  const gaps = [...score.gaps, ...narrative.gaps];
  const positive = [
    ...score.positiveSignalsFound,
    ...narrative.positiveSignals,
  ];
  const negative = [
    ...score.negativeSignalsFound,
    ...narrative.negativeSignals,
  ];

  return (
    <div className="space-y-6">
      <IosGroupedSection title="Qualification breakdown">
        <IosGroupedRow className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[17px] font-semibold leading-tight">
                {result.jobTitle ?? result.parsedJob.roleTitle ?? "Job"}
              </p>
              {result.companyName ? (
                <p className="text-[15px] text-muted-foreground">{result.companyName}</p>
              ) : null}
              {score.recommendationLabel ? (
                <p className="text-[15px] font-medium mt-1">{score.recommendationLabel}</p>
              ) : null}
              <p className="text-[13px] text-muted-foreground mt-0.5">
                {score.scoringMode === "guest" ? "Guest" : "Registered"} scoring
              </p>
            </div>
            <SaveJobButton analysisId={analysisId} />
          </div>
          <QualificationBreakdown
            score={score}
            postingContext={postingContext}
            parsedJob={parsedJob}
            parsedResume={parsedResume}
            jobDescription={jobDescription}
            jobTitle={result.jobTitle}
            profileDesiredCompensation={compensationForMatching}
            profileQualifiedIndustries={profileQualifiedIndustries}
            profileCountry={profileCountry}
            profileTimezone={profileTimezone}
          />
        </IosGroupedRow>
      </IosGroupedSection>

      <IosGroupedSection title="Insights">
        <IosGroupedRow className="space-y-5">
          <NarrativeList title="Strengths" items={strengths} />
          <NarrativeList title="Gaps" items={gaps} />
          <NarrativeList title="Recommendations" items={narrative.recommendations} />
          <NarrativeList title="Positive signals" items={positive} />
          <NarrativeList title="Negative signals" items={negative} />
        </IosGroupedRow>
      </IosGroupedSection>
    </div>
  );
}

export type { Narrative };
