"use client";

import { Progress, ProgressIndicator, ProgressTrack } from "@/components/ui/progress";
import {
  CoverageMatchPopover,
  SKILLS_POPOVER_LABELS,
  TOOLS_POPOVER_LABELS,
  type CoverageMatchPopoverLabels,
} from "@/components/coverage-match-popover";
import { AiEmphasisBreakdownRow } from "@/components/ai-emphasis-breakdown-row";
import { CompensationBreakdownRow } from "@/components/compensation-breakdown-row";
import { CountryBreakdownRow } from "@/components/country-breakdown-row";
import { breakdownCategoryCardClass } from "@/components/breakdown-accordion";
import { QualificationSummarySection } from "@/components/qualification-summary-section";
import { SummarySectionCard } from "@/components/summary-section-card";
import { TimezoneBreakdownRow } from "@/components/timezone-breakdown-row";
import {
  coverageDetailForCategory,
  type CoverageCategoryKey,
  type CoverageResult,
} from "@/lib/coverage-detail";
import { scoreColor, scoreProgressClass } from "@/lib/score";
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

/** Shown in the summary card grid — omitted from the category table. */
const SUMMARY_ONLY_KEYS = new Set<CategoryKey>([
  "industry",
  "compensation",
  "aiEmphasis",
  "country",
  "timezone",
]);

const COVERAGE_UI: Record<
  CoverageCategoryKey,
  { popoverLabels: CoverageMatchPopoverLabels }
> = {
  skills: { popoverLabels: SKILLS_POPOVER_LABELS },
  tools: { popoverLabels: TOOLS_POPOVER_LABELS },
  workflow: { popoverLabels: SKILLS_POPOVER_LABELS },
};

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

function CoverageBreakdownRow({
  label,
  category,
  coverageKey,
  parsedJob,
  parsedResume,
  jobDescription,
}: {
  label: string;
  category: CategoryScore;
  coverageKey: CoverageCategoryKey;
  parsedJob?: ParsedJob;
  parsedResume?: ParsedResume | null;
  jobDescription?: string | null;
}) {
  const ui = COVERAGE_UI[coverageKey];
  const pct = Math.round(category.score);

  const computed: CoverageResult | null = parsedJob
    ? coverageDetailForCategory(
        coverageKey,
        parsedJob,
        parsedResume,
        jobDescription,
      )
    : null;

  const detail =
    computed?.items?.length
      ? computed.items
      : category.matchDetail?.length
        ? category.matchDetail
        : [];

  const total = category.totalCount ?? detail.length;
  const matched =
    category.matchedCount ?? detail.filter((i) => i.matched).length;
  const showFraction = total > 0;
  const hasDetail = detail.length > 0;

  const body = (
    <>
      <div className="flex items-center justify-between gap-4">
        <span className="text-[15px] flex-1 min-w-0">{label}</span>
        <div className="flex items-baseline gap-2 shrink-0 tabular-nums">
          {showFraction ? (
            <span className="text-[15px] font-medium text-foreground">
              {matched}/{total}
            </span>
          ) : null}
          <span className={cn("text-[15px] font-medium", scoreColor(pct))}>
            {pct}%
          </span>
        </div>
      </div>
      <Progress value={pct} className="w-full gap-0">
        <ProgressTrack className="h-1.5">
          <ProgressIndicator className={scoreProgressClass(pct)} />
        </ProgressTrack>
      </Progress>
    </>
  );

  if (!hasDetail) {
    return (
      <div className={cn(breakdownCategoryCardClass, "space-y-2")}>{body}</div>
    );
  }

  return (
    <CoverageMatchPopover
      items={detail}
      labels={ui.popoverLabels}
      showBonusBadge={coverageKey === "tools"}
    >
      {body}
    </CoverageMatchPopover>
  );
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
  profileDesiredCompensation,
  profileQualifiedIndustries,
  profileCountry,
  profileTimezone,
}: {
  score: ScoreResult;
  postingContext?: PostingContext | null;
  parsedJob?: ParsedJob;
  parsedResume?: ParsedResume | null;
  jobDescription?: string | null;
  jobTitle?: string | null;
  profileDesiredCompensation?: Compensation | null;
  profileQualifiedIndustries?: string[] | null;
  profileCountry?: string | null;
  profileTimezone?: string | null;
}) {
  const rows = REGISTERED_WEIGHT_ROWS;
  const categoryRows = rows.filter(({ key }) => !SUMMARY_ONLY_KEYS.has(key));
  const breakdown = score.categoryBreakdown;
  const isGuest = score.scoringMode === "guest";
  const industryCategory = lookupCategory(breakdown, "industry");
  const industryLabel =
    rows.find(({ key }) => key === "industry")?.label ?? "Industry";
  const guestLabel =
    isGuest && process.env.NEXT_PUBLIC_QA_REGISTERED_SCORING === "true"
      ? "Guest account (re-run analyze after QA refresh for full breakdown)"
      : null;

  return (
    <div className="w-full space-y-3">
      <QualificationSummarySection
        score={score}
        industryLabel={industryLabel}
        industryCategory={
          industryCategory ?? {
            category: "industry",
            label: industryLabel,
            status: "unknown",
            score: 0,
            weight: isGuest ? 30 : 18,
            contribution: 0,
          }
        }
        parsedJob={parsedJob}
        parsedResume={parsedResume}
        profileQualifiedIndustries={profileQualifiedIndustries}
        profileDesiredCompensation={profileDesiredCompensation}
        profileTimezone={profileTimezone}
        jobDescription={jobDescription}
        jobTitle={analysisJobTitle}
      />

      <SummarySectionCard title="Category matching">
        <div className="space-y-3">
          {categoryRows.map(({ key, label }) => {
          if (isGuest && !GUEST_SCORED_KEYS.has(key)) {
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
                <CoverageBreakdownRow
                  key={key}
                  label={label}
                  category={displayCategory}
                  coverageKey={key}
                  parsedJob={parsedJob}
                  parsedResume={parsedResume}
                  jobDescription={jobDescription}
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
              ? "Unknown"
              : `${Math.round(c.score)}%`;

          return (
            <BreakdownRow
              key={key}
              label={label}
              match={match}
              mutedMatch={match === "Unknown"}
            />
          );
        })}

          {guestLabel ? (
            <p className="text-[12px] text-amber-700 dark:text-amber-500 mt-2 leading-snug">
              {guestLabel}
            </p>
          ) : null}
        </div>
      </SummarySectionCard>
    </div>
  );
}
