"use client";

import { JobPostingRequirementFields } from "@/components/job-posting-requirement-fields";
import { TalentTypeField } from "@/components/talent-type-field";
import { IndustrySummaryContent } from "@/components/industry-breakdown-row";
import { PostingDetailFields } from "@/components/posting-details-grid";
import { QualificationScoreCircle } from "@/components/qualification-score-circle";
import { SummaryFieldLabel } from "@/components/summary-field-label";
import { SummaryMatchBadge } from "@/components/summary-match-badge";
import { SummarySectionCard } from "@/components/summary-section-card";
import { cn } from "@/lib/utils";
import type { PostingDetailHighlightContext } from "@/lib/posting-detail-highlights";
import { resolvePostingDetailSections } from "@/lib/posting-details";
import { talentTypeDisplay } from "@/lib/talent-type-display";
import {
  buildSummaryCriteria,
  type SummaryCriterion,
} from "@/lib/summary-criteria";
import type {
  CategoryScore,
  Compensation,
  ParsedJob,
  ParsedResume,
  ScoreResult,
} from "@/lib/types";

function SummaryCriterionField({ criterion }: { criterion: SummaryCriterion }) {
  return (
    <div className="space-y-1.5 min-w-0">
      <SummaryFieldLabel>{criterion.title}</SummaryFieldLabel>
      <SummaryMatchBadge label={criterion.badgeLabel} state={criterion.state} />
    </div>
  );
}

const CLIENT_CARD_CRITERION_KEYS = new Set(["timezone"]);
const ROLE_CARD_CRITERION_KEYS = new Set(["compensation"]);
const CLIENT_PREFERENCES_CRITERION_KEYS = new Set(["aiEmphasis"]);

export function QualificationSummarySection({
  score,
  industryLabel,
  industryCategory,
  parsedJob,
  parsedResume,
  profileQualifiedIndustries,
  profileDesiredCompensation,
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
  profileTimezone?: string | null;
  jobDescription?: string | null;
  jobTitle?: string | null;
}) {
  const isGuest = score.scoringMode === "guest";
  const showIndustry = Boolean(industryCategory || parsedJob);
  const showPostingDetails = parsedJob != null;
  const criteria = buildSummaryCriteria({
    parsedJob,
    parsedResume,
    profileDesiredCompensation,
    profileTimezone,
    jobDescription,
    breakdown: score.categoryBreakdown,
    isGuest,
  });

  const clientCardCriteria = criteria.filter((c) =>
    CLIENT_CARD_CRITERION_KEYS.has(c.key),
  );
  const roleCardCriteria = criteria.filter((c) => ROLE_CARD_CRITERION_KEYS.has(c.key));
  const preferencesCardCriteria = criteria.filter((c) =>
    CLIENT_PREFERENCES_CRITERION_KEYS.has(c.key),
  );
  const compensationCriterion = roleCardCriteria.find((c) => c.key === "compensation");
  const aiEmphasisCriterion = preferencesCardCriteria.find(
    (c) => c.key === "aiEmphasis",
  );

  if (
    !showIndustry &&
    !showPostingDetails &&
    clientCardCriteria.length === 0 &&
    roleCardCriteria.length === 0 &&
    preferencesCardCriteria.length === 0
  ) {
    return null;
  }

  const postingSections = parsedJob
    ? resolvePostingDetailSections(parsedJob, { jobDescription, jobTitle })
    : [];
  const clientSection = postingSections.find((s) => s.id === "client");
  const clientOriginRow = clientSection?.rows.find((r) => r.key === "clientOrigin");
  const clientRatingRow = clientSection?.rows.find((r) => r.key === "clientRating");
  const clientAvgHourlyRow = clientSection?.rows.find(
    (r) => r.key === "clientAverageHourlyRate",
  );
  const clientTimezoneCriterion = clientCardCriteria.find((c) => c.key === "timezone");
  const showClientHeroRow = Boolean(clientOriginRow || clientTimezoneCriterion);
  const showClientStatsRow = Boolean(clientRatingRow || clientAvgHourlyRow);
  const roleSection = postingSections.find((s) => s.id === "role");
  const rolePostingRow = roleSection?.rows.find((r) => r.key === "role");
  const hoursNeededRow = roleSection?.rows.find((r) => r.key === "hoursNeeded");
  const durationRow = roleSection?.rows.find((r) => r.key === "duration");
  const otherRolePostingRows =
    roleSection?.rows.filter(
      (r) =>
        r.key !== "hireArea" &&
        r.key !== "role" &&
        r.key !== "datePosted" &&
        r.key !== "hoursNeeded" &&
        r.key !== "duration",
    ) ?? [];
  const showRoleMetaRow = Boolean(rolePostingRow);
  const showIndustryCompRow = showIndustry || Boolean(compensationCriterion);
  const showRoleEngagementRow = Boolean(hoursNeededRow || durationRow);
  const showTalentType = talentTypeDisplay(jobDescription).hasExplicitRequirement;
  const showClientCard = Boolean(clientSection || clientCardCriteria.length > 0);
  const showJobRequirements = Boolean(parsedJob || jobDescription?.trim());
  const showClientPreferencesMetaRow = Boolean(
    showTalentType || aiEmphasisCriterion,
  );
  const showClientPreferencesCard = Boolean(
    showJobRequirements || showClientPreferencesMetaRow,
  );
  const showRoleCard = Boolean(
    roleSection ||
      showIndustry ||
      compensationCriterion ||
      showRoleEngagementRow,
  );

  const highlightCtx: PostingDetailHighlightContext = {
    profileDesiredCompensation,
    parsedResume,
    parsedJob,
    jobTitle,
  };

  return (
    <div className="space-y-3 w-full" role="region" aria-label="Qualification summary">
      <div className="flex justify-center py-1">
        <QualificationScoreCircle
          fitScore={score.fitScore}
          recommendationLabel={score.recommendationLabel}
          recommendation={score.recommendation}
        />
      </div>

      {showClientCard ? (
        <SummarySectionCard title={clientSection?.title ?? "Client Profile"}>
          <div className="space-y-3">
            {showClientHeroRow ? (
              <div
                className={cn(
                  "grid min-w-0 gap-x-4 gap-y-3",
                  clientOriginRow && clientTimezoneCriterion
                    ? "grid-cols-2"
                    : "grid-cols-1",
                )}
              >
                {clientOriginRow ? (
                  <PostingDetailFields
                    rows={[clientOriginRow]}
                    highlightCtx={highlightCtx}
                    layout="stack"
                  />
                ) : null}
                {clientTimezoneCriterion ? (
                  <SummaryCriterionField criterion={clientTimezoneCriterion} />
                ) : null}
              </div>
            ) : null}
            {showClientStatsRow ? (
              <div
                className={cn(
                  "grid min-w-0 gap-x-4 gap-y-3",
                  clientRatingRow && clientAvgHourlyRow
                    ? "grid-cols-2"
                    : "grid-cols-1",
                )}
              >
                {clientRatingRow ? (
                  <PostingDetailFields
                    rows={[clientRatingRow]}
                    highlightCtx={highlightCtx}
                    layout="stack"
                  />
                ) : null}
                {clientAvgHourlyRow ? (
                  <PostingDetailFields
                    rows={[clientAvgHourlyRow]}
                    highlightCtx={highlightCtx}
                    layout="stack"
                  />
                ) : null}
              </div>
            ) : null}
          </div>
        </SummarySectionCard>
      ) : null}

      {showClientPreferencesCard ? (
        <SummarySectionCard title="Client Preferences">
          <div className="space-y-3">
            {showJobRequirements ? (
              <JobPostingRequirementFields
                parsedJob={parsedJob}
                jobDescription={jobDescription}
              />
            ) : null}
            {showClientPreferencesMetaRow ? (
              <div
                className={cn(
                  "grid min-w-0 gap-x-4 gap-y-3",
                  showTalentType && aiEmphasisCriterion
                    ? "grid-cols-2"
                    : "grid-cols-1",
                )}
              >
                {showTalentType ? (
                  <TalentTypeField jobDescription={jobDescription} />
                ) : null}
                {aiEmphasisCriterion ? (
                  <SummaryCriterionField criterion={aiEmphasisCriterion} />
                ) : null}
              </div>
            ) : null}
          </div>
        </SummarySectionCard>
      ) : null}

      {showRoleCard ? (
        <SummarySectionCard title={roleSection?.title ?? "Role Details"}>
          <div className="space-y-3">
            {showRoleMetaRow && rolePostingRow ? (
              <PostingDetailFields
                rows={[rolePostingRow]}
                highlightCtx={highlightCtx}
                layout="stack"
              />
            ) : null}
            {showIndustryCompRow ? (
              <div
                className={cn(
                  "grid min-w-0 gap-x-4 gap-y-3",
                  showIndustry && compensationCriterion
                    ? "grid-cols-2"
                    : "grid-cols-1",
                )}
              >
                {showIndustry ? (
                  <IndustrySummaryContent
                    label={industryLabel}
                    category={industryCategory}
                    parsedJob={parsedJob}
                    parsedResume={parsedResume}
                    profileQualifiedIndustries={profileQualifiedIndustries}
                  />
                ) : null}
                {compensationCriterion ? (
                  <SummaryCriterionField criterion={compensationCriterion} />
                ) : null}
              </div>
            ) : null}
            {showRoleEngagementRow ? (
              <div
                className={cn(
                  "grid min-w-0 gap-x-4 gap-y-3",
                  hoursNeededRow && durationRow ? "grid-cols-2" : "grid-cols-1",
                )}
              >
                {hoursNeededRow ? (
                  <PostingDetailFields
                    rows={[hoursNeededRow]}
                    highlightCtx={highlightCtx}
                    layout="stack"
                  />
                ) : null}
                {durationRow ? (
                  <PostingDetailFields
                    rows={[durationRow]}
                    highlightCtx={highlightCtx}
                    layout="stack"
                  />
                ) : null}
              </div>
            ) : null}
            {otherRolePostingRows.length > 0 ? (
              <PostingDetailFields
                rows={otherRolePostingRows}
                highlightCtx={highlightCtx}
              />
            ) : null}
          </div>
        </SummarySectionCard>
      ) : null}
    </div>
  );
}
