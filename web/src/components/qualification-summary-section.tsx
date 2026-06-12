"use client";

import { SummaryScoredField } from "@/components/summary-scored-field";
import { SectionScoreSubtotal } from "@/components/section-score-subtotal";
import { SummarySectionCard } from "@/components/summary-section-card";
import { ReportRevealSection } from "@/components/report-reveal-section";
import { buildReportRollupOptions } from "@/lib/report-rollup-context";
import {
  buildClientProfileFields,
  buildClientPreferencesFields,
  buildRoleDetailsFields,
  sectionFieldFraction,
} from "@/lib/section-field-scoring";
import {
  scoringCategoryTitleForScore,
  sectionCategoryScore,
} from "@/lib/opportunity-categories";
import {
  SCORING_CATEGORY_INFO,
} from "@/lib/scoring-terminology";
import { cn } from "@/lib/utils";
import type {
  Compensation,
  ParsedJob,
  ParsedResume,
  PostingContext,
  ScoreResult,
} from "@/lib/types";

function fieldByKey<T extends { key: string }>(fields: T[], key: string): T | undefined {
  return fields.find((f) => f.key === key);
}

export function QualificationSummarySection({
  score,
  parsedJob,
  parsedResume,
  profileQualifiedIndustries,
  profileDesiredCompensation,
  profileCountry,
  profileTimezone,
  jobDescription,
  jobTitle,
  companyName,
  postingContext,
}: {
  score: ScoreResult;
  parsedJob?: ParsedJob;
  parsedResume?: ParsedResume | null;
  profileQualifiedIndustries?: string[] | null;
  profileDesiredCompensation?: Compensation | null;
  profileCountry?: string | null;
  profileTimezone?: string | null;
  jobDescription?: string | null;
  jobTitle?: string | null;
  companyName?: string | null;
  postingContext?: PostingContext | null;
}) {
  const isGuest = score.scoringMode === "guest";
  const rollupOptions = buildReportRollupOptions({
    score,
    parsedJob,
    parsedResume,
    profileDesiredCompensation,
    profileQualifiedIndustries,
    profileCountry,
    profileTimezone,
    jobDescription,
    jobTitle,
    companyName,
    postingContext,
  });

  const postingRows = rollupOptions?.postingRows ?? [];
  const highlightCtx = rollupOptions?.highlightCtx ?? {
    profileDesiredCompensation,
    parsedResume,
    parsedJob,
    jobTitle,
  };
  const fieldCtx =
    rollupOptions?.fieldContext ?? {
      parsedJob,
      parsedResume,
      profileDesiredCompensation,
      profileQualifiedIndustries,
      profileCountry,
      profileTimezone,
      jobDescription,
      jobTitle,
      companyName,
      postingContext,
      breakdown: score.categoryBreakdown,
      isGuest,
    };

  const clientFields = buildClientProfileFields(
    fieldCtx,
    postingRows,
    highlightCtx,
  );
  const preferencesFields = buildClientPreferencesFields(fieldCtx);
  const roleFields = buildRoleDetailsFields(fieldCtx, postingRows, highlightCtx);

  const showClientCard = clientFields.length > 0;
  const showPreferencesCard = preferencesFields.length > 0;
  const showRoleCard = roleFields.length > 0;

  if (!showClientCard && !showPreferencesCard && !showRoleCard) {
    return null;
  }

  const clientProfileSubtotal = sectionCategoryScore(
    score,
    "clientProfile",
    rollupOptions,
  );
  const clientPreferencesSubtotal = sectionCategoryScore(
    score,
    "clientPreferences",
    rollupOptions,
  );
  const roleDetailsSubtotal = sectionCategoryScore(
    score,
    "roleDetails",
    rollupOptions,
  );

  const clientProfileFraction = sectionFieldFraction(clientFields);
  const clientPreferencesFraction = sectionFieldFraction(preferencesFields);
  const roleDetailsFraction = sectionFieldFraction(roleFields);

  const locationField = fieldByKey(clientFields, "clientOrigin");
  const ratingField = fieldByKey(clientFields, "clientRating");
  const avgPayField = fieldByKey(clientFields, "clientAverageHourlyRate");
  const platformField = fieldByKey(clientFields, "platform");
  const employerField = fieldByKey(clientFields, "employerType");
  const postedField = fieldByKey(clientFields, "datePosted");
  const hireAreaField = fieldByKey(clientFields, "hireArea");

  const industryField = fieldByKey(roleFields, "industry");
  const roleField = fieldByKey(roleFields, "role");
  const compensationField = fieldByKey(roleFields, "compensation");
  const hoursField = fieldByKey(roleFields, "hoursNeeded");
  const durationField = fieldByKey(roleFields, "duration");
  const countryField = fieldByKey(preferencesFields, "locationPreferred");
  const timezonePrefField = fieldByKey(preferencesFields, "timezonePreferred");
  const aiField = fieldByKey(preferencesFields, "aiEmphasis");

  return (
    <div className="space-y-3 w-full" role="region" aria-label="Scoring categories">
      {showClientCard ? (
        <ReportRevealSection>
        <SummarySectionCard
          title={scoringCategoryTitleForScore("clientProfile", score)}
          info={SCORING_CATEGORY_INFO.clientProfile}
        >
          <div className="space-y-3">
            {platformField ? (
              <SummaryScoredField field={platformField} />
            ) : null}
            {employerField || postedField ? (
              <div
                className={cn(
                  "grid min-w-0 gap-x-4 gap-y-3",
                  employerField && postedField ? "grid-cols-2" : "grid-cols-1",
                )}
              >
                {employerField ? <SummaryScoredField field={employerField} /> : null}
                {postedField ? (
                  <SummaryScoredField
                    field={postedField}
                    postingDetailKey="datePosted"
                  />
                ) : null}
              </div>
            ) : null}
            {hireAreaField ? (
              <SummaryScoredField
                field={hireAreaField}
                postingDetailKey="hireArea"
              />
            ) : null}
            {locationField ? (
              <SummaryScoredField
                field={locationField}
                postingDetailKey="clientOrigin"
              />
            ) : null}
            {ratingField || avgPayField ? (
              <div
                className={cn(
                  "grid min-w-0 gap-x-4 gap-y-3",
                  ratingField && avgPayField ? "grid-cols-2" : "grid-cols-1",
                )}
              >
                {ratingField ? (
                  <SummaryScoredField
                    field={ratingField}
                    postingDetailKey="clientRating"
                  />
                ) : null}
                {avgPayField ? (
                  <SummaryScoredField
                    field={avgPayField}
                    postingDetailKey="clientAverageHourlyRate"
                  />
                ) : null}
              </div>
            ) : null}
          </div>
          <SectionScoreSubtotal
            score={clientProfileSubtotal}
            fraction={clientProfileFraction}
            animateDelay={350}
          />
        </SummarySectionCard>
        </ReportRevealSection>
      ) : null}

      {showPreferencesCard ? (
        <ReportRevealSection>
        <SummarySectionCard
          title={scoringCategoryTitleForScore("clientPreferences", score)}
          info={SCORING_CATEGORY_INFO.clientPreferences}
        >
          <div className="space-y-3">
            {countryField || timezonePrefField ? (
              <div
                className={cn(
                  "grid min-w-0 gap-x-4 gap-y-3",
                  countryField && timezonePrefField
                    ? "grid-cols-2"
                    : "grid-cols-1",
                )}
              >
                {countryField ? <SummaryScoredField field={countryField} /> : null}
                {timezonePrefField ? (
                  <SummaryScoredField field={timezonePrefField} />
                ) : null}
              </div>
            ) : null}
            {aiField ? <SummaryScoredField field={aiField} /> : null}
          </div>
          <SectionScoreSubtotal
            score={clientPreferencesSubtotal}
            fraction={clientPreferencesFraction}
            animateDelay={450}
          />
        </SummarySectionCard>
        </ReportRevealSection>
      ) : null}

      {showRoleCard ? (
        <ReportRevealSection>
        <SummarySectionCard
          title={scoringCategoryTitleForScore("roleDetails", score)}
          info={SCORING_CATEGORY_INFO.roleDetails}
        >
          <div className="space-y-3">
            {roleField ? <SummaryScoredField field={roleField} postingDetailKey="role" /> : null}
            {industryField ? <SummaryScoredField field={industryField} /> : null}
            {compensationField ? (
              <SummaryScoredField field={compensationField} />
            ) : null}
            {hoursField || durationField ? (
              <div
                className={cn(
                  "grid min-w-0 gap-x-4 gap-y-3",
                  hoursField && durationField ? "grid-cols-2" : "grid-cols-1",
                )}
              >
                {hoursField ? (
                  <SummaryScoredField
                    field={hoursField}
                    postingDetailKey="hoursNeeded"
                  />
                ) : null}
                {durationField ? (
                  <SummaryScoredField
                    field={durationField}
                    postingDetailKey="duration"
                  />
                ) : null}
              </div>
            ) : null}
          </div>
          <SectionScoreSubtotal
            score={roleDetailsSubtotal}
            fraction={roleDetailsFraction}
            animateDelay={550}
          />
        </SummarySectionCard>
        </ReportRevealSection>
      ) : null}
    </div>
  );
}
