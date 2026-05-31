"use client";

import { IndustrySummaryContent } from "@/components/industry-breakdown-row";
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
  SCORING_CATEGORY_INFO,
  scoringCategoryTitle,
} from "@/lib/scoring-terminology";
import { sectionRollupScore } from "@/lib/section-score-rollups";
import { cn } from "@/lib/utils";
import type {
  CategoryScore,
  Compensation,
  ParsedJob,
  ParsedResume,
  ScoreResult,
} from "@/lib/types";

function fieldByKey<T extends { key: string }>(fields: T[], key: string): T | undefined {
  return fields.find((f) => f.key === key);
}

export function QualificationSummarySection({
  score,
  industryLabel,
  industryCategory,
  parsedJob,
  parsedResume,
  profileQualifiedIndustries,
  profileDesiredCompensation,
  profileCountry,
  profileTimezone,
  jobDescription,
  jobTitle,
}: {
  score: ScoreResult;
  industryLabel: string;
  industryCategory: CategoryScore;
  parsedJob?: ParsedJob;
  parsedResume?: ParsedResume | null;
  profileQualifiedIndustries?: string[] | null;
  profileDesiredCompensation?: Compensation | null;
  profileCountry?: string | null;
  profileTimezone?: string | null;
  jobDescription?: string | null;
  jobTitle?: string | null;
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
  const showRoleCard =
    roleFields.length > 0 || Boolean(industryCategory || parsedJob);

  if (!showClientCard && !showPreferencesCard && !showRoleCard) {
    return null;
  }

  const clientProfileSubtotal = sectionRollupScore(
    score.categoryBreakdown,
    isGuest,
    "clientProfile",
    rollupOptions,
  );
  const clientPreferencesSubtotal = sectionRollupScore(
    score.categoryBreakdown,
    isGuest,
    "clientPreferences",
    rollupOptions,
  );
  const roleDetailsSubtotal = sectionRollupScore(
    score.categoryBreakdown,
    isGuest,
    "roleDetails",
    rollupOptions,
  );

  const clientProfileFraction = sectionFieldFraction(clientFields);
  const clientPreferencesFraction = sectionFieldFraction(preferencesFields);
  const roleDetailsFraction = sectionFieldFraction(roleFields);

  const locationField = fieldByKey(clientFields, "clientOrigin");
  const timezoneField = fieldByKey(clientFields, "timezone");
  const ratingField = fieldByKey(clientFields, "clientRating");
  const avgPayField = fieldByKey(clientFields, "clientAverageHourlyRate");

  const roleField = fieldByKey(roleFields, "role");
  const compensationField = fieldByKey(roleFields, "compensation");
  const hoursField = fieldByKey(roleFields, "hoursNeeded");
  const durationField = fieldByKey(roleFields, "duration");
  const countryField = fieldByKey(preferencesFields, "locationPreferred");
  const timezonePrefField = fieldByKey(preferencesFields, "timezonePreferred");
  const talentField = fieldByKey(preferencesFields, "talentType");
  const aiField = fieldByKey(preferencesFields, "aiEmphasis");

  return (
    <div className="space-y-3 w-full" role="region" aria-label="Scoring categories">
      {showClientCard ? (
        <ReportRevealSection>
        <SummarySectionCard
          title={scoringCategoryTitle("clientProfile")}
          info={SCORING_CATEGORY_INFO.clientProfile}
        >
          <div className="space-y-3">
            {locationField || timezoneField ? (
              <div
                className={cn(
                  "grid min-w-0 gap-x-4 gap-y-3",
                  locationField && timezoneField ? "grid-cols-2" : "grid-cols-1",
                )}
              >
                {locationField ? (
                  <SummaryScoredField
                    field={locationField}
                    postingDetailKey="clientOrigin"
                  />
                ) : null}
                {timezoneField ? (
                  <SummaryScoredField field={timezoneField} />
                ) : null}
              </div>
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
          title={scoringCategoryTitle("clientPreferences")}
          info={SCORING_CATEGORY_INFO.clientPreferences}
        >
          <div className="space-y-3">
            {countryField || timezonePrefField ? (
              <div
                className={cn(
                  "grid min-w-0 gap-x-4 gap-y-3",
                  countryField && timezonePrefField
                    ? "grid-cols-1 sm:grid-cols-2"
                    : "grid-cols-1",
                )}
              >
                {countryField ? <SummaryScoredField field={countryField} /> : null}
                {timezonePrefField ? (
                  <SummaryScoredField field={timezonePrefField} />
                ) : null}
              </div>
            ) : null}
            {talentField || aiField ? (
              <div
                className={cn(
                  "grid min-w-0 gap-x-4 gap-y-3",
                  talentField && aiField
                    ? "grid-cols-1 sm:grid-cols-2"
                    : "grid-cols-1",
                )}
              >
                {talentField ? <SummaryScoredField field={talentField} /> : null}
                {aiField ? <SummaryScoredField field={aiField} /> : null}
              </div>
            ) : null}
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
          title={scoringCategoryTitle("roleDetails")}
          info={SCORING_CATEGORY_INFO.roleDetails}
        >
          <div className="space-y-3">
            {roleField ? <SummaryScoredField field={roleField} postingDetailKey="role" /> : null}
            <div
              className={cn(
                "grid min-w-0 gap-x-4 gap-y-3",
                !isGuest && compensationField ? "grid-cols-2" : "grid-cols-1",
              )}
            >
              <IndustrySummaryContent
                label={industryLabel}
                category={industryCategory}
                parsedJob={parsedJob}
                parsedResume={parsedResume}
                profileQualifiedIndustries={profileQualifiedIndustries}
              />
              {!isGuest && compensationField ? (
                <SummaryScoredField field={compensationField} />
              ) : null}
            </div>
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
