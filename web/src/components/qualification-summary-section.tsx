"use client";

import { ClientPreferencesSubsection } from "@/components/client-preferences-subsection";
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
import type {
  Compensation,
  ParsedJob,
  ParsedResume,
  PostingContext,
  ScoreResult,
} from "@/lib/types";
import type { SectionFieldScore } from "@/lib/section-field-scoring";

function fieldByKey<T extends { key: string }>(fields: T[], key: string): T | undefined {
  return fields.find((f) => f.key === key);
}

function ScoredFieldGrid({
  items,
}: {
  items: {
    field?: SectionFieldScore;
    postingDetailKey?: string;
  }[];
}) {
  const visible = items.filter(
    (item): item is { field: SectionFieldScore; postingDetailKey?: string } =>
      Boolean(item.field),
  );
  if (visible.length === 0) return null;

  return (
    <div className="grid min-w-0 grid-cols-2 gap-x-4 gap-y-3">
      {visible.map(({ field, postingDetailKey }) => (
        <SummaryScoredField
          key={field.key}
          field={field}
          postingDetailKey={postingDetailKey}
        />
      ))}
    </div>
  );
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
  const clientPreferencesFields = buildClientPreferencesFields(fieldCtx);
  const roleFields = buildRoleDetailsFields(fieldCtx, postingRows, highlightCtx);

  const showClientCard = clientFields.length > 0;
  const showRoleCard = roleFields.length > 0;

  if (!showClientCard && !showRoleCard) {
    return null;
  }

  const clientProfileSubtotal = sectionCategoryScore(
    score,
    "clientProfile",
    rollupOptions,
  );
  const roleDetailsSubtotal = sectionCategoryScore(
    score,
    "roleDetails",
    rollupOptions,
  );

  const clientProfileFraction = sectionFieldFraction(clientFields);
  const roleDetailsFraction = sectionFieldFraction(roleFields);

  const locationField = fieldByKey(clientFields, "clientOrigin");
  const ratingField = fieldByKey(clientFields, "clientRating");
  const avgPayField = fieldByKey(clientFields, "clientAverageHourlyRate");
  const employerField = fieldByKey(clientFields, "employerType");

  const industryField = fieldByKey(roleFields, "industry");
  const roleField = fieldByKey(roleFields, "role");
  const compensationField = fieldByKey(roleFields, "compensation");
  const hoursField = fieldByKey(roleFields, "hoursNeeded");
  const durationField = fieldByKey(roleFields, "duration");

  return (
    <div className="space-y-3 w-full" role="region" aria-label="Scoring categories">
      {showClientCard ? (
        <ReportRevealSection>
        <SummarySectionCard
          title={scoringCategoryTitleForScore("clientProfile", score)}
          info={SCORING_CATEGORY_INFO.clientProfile}
        >
          <ScoredFieldGrid
            items={[
              { field: employerField },
              {
                field: locationField,
                postingDetailKey: "clientOrigin",
              },
              {
                field: ratingField,
                postingDetailKey: "clientRating",
              },
              {
                field: avgPayField,
                postingDetailKey: "clientAverageHourlyRate",
              },
            ]}
          />
          <ClientPreferencesSubsection fields={clientPreferencesFields} />
          <SectionScoreSubtotal
            score={clientProfileSubtotal}
            fraction={clientProfileFraction}
            animateDelay={350}
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
          <ScoredFieldGrid
            items={[
              { field: roleField, postingDetailKey: "role" },
              { field: industryField },
              { field: compensationField },
              {
                field: hoursField,
                postingDetailKey: "hoursNeeded",
              },
              {
                field: durationField,
                postingDetailKey: "duration",
              },
            ]}
          />
          <SectionScoreSubtotal
            score={roleDetailsSubtotal}
            fraction={roleDetailsFraction}
            animateDelay={450}
          />
        </SummarySectionCard>
        </ReportRevealSection>
      ) : null}
    </div>
  );
}
