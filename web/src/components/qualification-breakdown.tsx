"use client";

import { AiEmphasisBreakdownRow } from "@/components/ai-emphasis-breakdown-row";
import { CompensationBreakdownRow } from "@/components/compensation-breakdown-row";
import { CountryBreakdownRow } from "@/components/country-breakdown-row";
import { breakdownCategoryCardClass } from "@/components/breakdown-accordion";
import { QualificationCoveragePillsRow } from "@/components/qualification-coverage-pills-row";
import { QualificationScoreOverview } from "@/components/qualification-score-overview";
import { QualificationSummarySection } from "@/components/qualification-summary-section";
import { ReportRevealSection } from "@/components/report-reveal-section";
import { SectionScoreSubtotal } from "@/components/section-score-subtotal";
import { SummarySectionCard } from "@/components/summary-section-card";
import { buildReportRollupOptions } from "@/lib/report-rollup-context";
import {
  buildQualificationsFields,
  sectionFieldFraction,
} from "@/lib/section-field-scoring";
import {
  scoringCategoryTitleForScore,
  sectionCategoryScore,
} from "@/lib/opportunity-categories";
import { TimezoneBreakdownRow } from "@/components/timezone-breakdown-row";
import {
  coverageDetailForCategory,
  type CoverageCategoryKey,
  type CoverageResult,
} from "@/lib/coverage-detail";
import {
  scoreColor,
} from "@/lib/score";
import { NOT_SPECIFIED_LABEL } from "@/lib/not-specified";
import {
  SCORING_CATEGORY_INFO,
} from "@/lib/scoring-terminology";
import { GUEST_WEIGHT_ROWS, REGISTERED_WEIGHT_ROWS } from "@/lib/scoring-weights";
import type {
  CategoryKey,
  CategoryScore,
  Compensation,
  ParsedJob,
  ParsedResume,
  PostingContext,
  ScoreResult,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const GUEST_SCORED_KEYS = new Set(GUEST_WEIGHT_ROWS.map((r) => r.key));

/** Guest analyses omit some server weights, but tool matching is still shown in Qualifications. */
const GUEST_QUALIFICATION_ROW_KEYS = new Set<CategoryKey>([
  ...GUEST_SCORED_KEYS,
  "tools",
]);

/** Shown in scoring category cards — omitted from the qualifications table. */
const SUMMARY_ONLY_KEYS = new Set<CategoryKey>([
  "industry",
  "compensation",
  "aiEmphasis",
  "country",
  "timezone",
]);

function resolveCoverageCategory(
  key: CoverageCategoryKey,
  label: string,
  existing: CategoryScore | undefined,
  computed: CoverageResult | null,
): CategoryScore | null {
  if (!computed || computed.total === 0) return existing ?? null;
  if (existing && existing.status !== "unknown") {
    return {
      ...existing,
      matchedCount: existing.matchedCount ?? computed.matched,
      totalCount: existing.totalCount ?? computed.total,
      matchDetail: computed.items,
    };
  }

  const pct = (computed.matched / computed.total) * 100;
  const threshold = 50;

  return {
    category: key,
    label,
    status: pct >= threshold ? "match" : "mismatch",
    score: pct,
    weight: existing?.weight ?? 0,
    contribution: existing?.contribution ?? 0,
    matchedCount: computed.matched,
    totalCount: computed.total,
    matchDetail: computed.items,
  };
}

function BreakdownRow({
  label,
  match,
  mutedMatch,
}: {
  label: string;
  match: string;
  mutedMatch?: boolean;
}) {
  const matchNum = parseFloat(match);
  const matchClass =
    !mutedMatch && !Number.isNaN(matchNum)
      ? scoreColor(matchNum)
      : "text-foreground";

  return (
    <div
      className={cn(
        breakdownCategoryCardClass,
        "flex items-baseline justify-between gap-4",
      )}
    >
      <span className="text-[15px] flex-1 min-w-0">{label}</span>
      <span
        className={cn(
          "text-[15px] tabular-nums shrink-0 w-16 text-right",
          matchClass,
          mutedMatch && "text-muted-foreground",
        )}
      >
        {match}
      </span>
    </div>
  );
}

function lookupCategory(
  breakdown: CategoryScore[],
  key: CategoryKey,
): CategoryScore | undefined {
  return breakdown.find((c) => c.category === key);
}

function isCoverageCategory(key: CategoryKey): key is CoverageCategoryKey {
  return key === "skills" || key === "tools";
}

export function QualificationBreakdown({
  score,
  postingContext,
  parsedJob,
  parsedResume,
  jobDescription,
  jobTitle: analysisJobTitle,
  companyName,
  profileDesiredCompensation,
  profileQualifiedIndustries,
  profileQualifiedSkills,
  profileCountry,
  profileTimezone,
}: {
  score: ScoreResult;
  postingContext?: PostingContext | null;
  parsedJob?: ParsedJob;
  parsedResume?: ParsedResume | null;
  jobDescription?: string | null;
  jobTitle?: string | null;
  companyName?: string | null;
  profileDesiredCompensation?: Compensation | null;
  profileQualifiedIndustries?: string[] | null;
  profileQualifiedSkills?: string[] | null;
  profileCountry?: string | null;
  profileTimezone?: string | null;
}) {
  const rows = REGISTERED_WEIGHT_ROWS;
  const categoryRows = rows.filter(({ key }) => !SUMMARY_ONLY_KEYS.has(key));
  const breakdown = score.categoryBreakdown;
  const isGuest = score.scoringMode === "guest";
  const rollupOptions = buildReportRollupOptions({
    score,
    parsedJob,
    parsedResume,
    profileDesiredCompensation,
    profileQualifiedIndustries,
    profileQualifiedSkills,
    profileCountry,
    profileTimezone,
    jobDescription,
    jobTitle: analysisJobTitle,
    companyName,
    postingContext,
  });

  const qualificationsSubtotal = sectionCategoryScore(
    score,
    "categoryMatching",
    rollupOptions,
  );
  const qualificationsFraction = sectionFieldFraction(
    buildQualificationsFields(rollupOptions.fieldContext),
  );

  return (
    <div className="w-full space-y-3">
      <ReportRevealSection>
        <QualificationScoreOverview score={score} rollupOptions={rollupOptions} />
      </ReportRevealSection>
      <QualificationSummarySection
        score={score}
        parsedJob={parsedJob}
        parsedResume={parsedResume}
        profileQualifiedIndustries={profileQualifiedIndustries}
        profileDesiredCompensation={profileDesiredCompensation}
        profileTimezone={profileTimezone}
        jobDescription={jobDescription}
        jobTitle={analysisJobTitle}
        companyName={companyName}
        postingContext={postingContext}
      />

      <ReportRevealSection>
        <SummarySectionCard
          title={scoringCategoryTitleForScore("categoryMatching", score)}
          info={SCORING_CATEGORY_INFO.categoryMatching}
        >
        <div className="space-y-3">
          {categoryRows.map(({ key, label }) => {
          if (isGuest && !GUEST_QUALIFICATION_ROW_KEYS.has(key)) {
            return (
              <BreakdownRow
                key={key}
                label={label}
                match="Not scored"
                mutedMatch
              />
            );
          }

          const c = lookupCategory(breakdown, key);

          if (isCoverageCategory(key) && parsedJob) {
            const computed = coverageDetailForCategory(
              key,
              parsedJob,
              parsedResume,
              jobDescription,
            );
            const displayCategory = resolveCoverageCategory(
              key,
              label,
              c,
              computed,
            );
            if (displayCategory) {
              return (
                <QualificationCoveragePillsRow
                  key={key}
                  label={label}
                  category={displayCategory}
                  coverageKey={key}
                  parsedJob={parsedJob}
                  parsedResume={parsedResume}
                  jobDescription={jobDescription}
                  profileQualifiedSkills={profileQualifiedSkills}
                />
              );
            }
          }

          if (key === "aiEmphasis") {
            return (
              <AiEmphasisBreakdownRow
                key={key}
                label={label}
                category={c}
                parsedJob={parsedJob}
                parsedResume={parsedResume}
              />
            );
          }

          if (key === "compensation") {
            return (
              <CompensationBreakdownRow
                key={key}
                label={label}
                category={c ?? { category: "compensation", label, status: "unknown", score: 0, weight: 5, contribution: 0 }}
                parsedJob={parsedJob}
                parsedResume={parsedResume}
                profileDesiredCompensation={profileDesiredCompensation}
              />
            );
          }

          if (key === "country") {
            return (
              <CountryBreakdownRow
                key={key}
                label={label}
                category={c}
                parsedJob={parsedJob}
                parsedResume={parsedResume}
                profileCountry={profileCountry}
              />
            );
          }

          if (key === "timezone") {
            return (
              <TimezoneBreakdownRow
                key={key}
                label={label}
                category={c}
                parsedJob={parsedJob}
                parsedResume={parsedResume}
                profileTimezone={profileTimezone}
              />
            );
          }

          const match =
            !c || c.status === "unknown"
              ? NOT_SPECIFIED_LABEL
              : `${Math.round(c.score)}%`;

          return (
            <BreakdownRow
              key={key}
              label={label}
              match={match}
              mutedMatch={match === NOT_SPECIFIED_LABEL}
            />
          );
        })}

          <SectionScoreSubtotal
            score={qualificationsSubtotal}
            fraction={qualificationsFraction}
            animateDelay={650}
          />
        </div>
      </SummarySectionCard>
      </ReportRevealSection>

    </div>
  );
}
