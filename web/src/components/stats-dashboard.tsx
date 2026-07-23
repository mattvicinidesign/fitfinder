"use client";

import { useMemo } from "react";
import { FitScoreRatio } from "@/components/fit-score-ratio";
import { RecentActivitySection } from "@/components/recent-activity-section";
import { MetricScore } from "@/components/ui/metric-score";
import {
  fitScoreValueOnTen,
} from "@/components/qualification-score-circle";
import { formatResumeReviewScorePercent } from "@/components/resume-review-ui";
import {
  type AnalysisStats,
  type OverallMatchCategoryAverage,
  type RecommendationStat,
  computeOverallMatchCategoryAverages,
  formatOverallMatchCategoryScoreOnTen,
} from "@/lib/analysis-stats";
import { resumeReviewScoreTextClass } from "@/lib/resume-review-score-colors";
import {
  isResumeScoreActivity,
  type RecentActivityItem,
} from "@/lib/recent-activity";
import { scoreColor } from "@/lib/score";
import { cn } from "@/lib/utils";

const CHART_SEGMENT_COLORS = [
  "var(--color-primary)",
  "color-mix(in oklch, var(--color-primary) 72%, white)",
  "color-mix(in oklch, var(--color-primary) 48%, white)",
  "color-mix(in oklch, var(--color-primary) 28%, white)",
  "color-mix(in oklch, var(--color-primary) 14%, white)",
];

function OverallMatchAnalysisBars({
  categories,
}: {
  categories: OverallMatchCategoryAverage[];
}) {
  return (
    <div className="space-y-3.5">
      {categories.map((item) => (
        <div key={item.id} className="space-y-1.5">
          <div className="flex items-center justify-between gap-3 text-[13px]">
            <span className="text-muted-foreground">{item.label}</span>
            <span
              className={cn(
                "font-semibold tabular-nums",
                item.averageScore != null
                  ? scoreColor(item.averageScore)
                  : "text-muted-foreground",
              )}
            >
              {formatOverallMatchCategoryScoreOnTen(item.id, item.averageScore)}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{
                width: `${Math.max(0, Math.min(100, item.averageScore ?? 0))}%`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function recommendationConicGradient(stats: RecommendationStat[]): string {
  if (stats.length === 0) return "conic-gradient(var(--color-muted) 0deg 360deg)";

  let cursor = 0;
  const stops: string[] = [];

  for (const [index, item] of stats.entries()) {
    const start = cursor;
    cursor += item.pct;
    const color = CHART_SEGMENT_COLORS[index % CHART_SEGMENT_COLORS.length];
    stops.push(`${color} ${start}% ${cursor}%`);
  }

  if (cursor < 100) {
    stops.push(`var(--color-muted) ${cursor}% 100%`);
  }

  return `conic-gradient(${stops.join(", ")})`;
}

function KpiCard({
  label,
  value,
  hint,
  valueClassName,
  rawValue = false,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  valueClassName?: string;
  rawValue?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-card/80 p-3.5 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
        {label}
      </p>
      {rawValue ? (
        <div className="mt-1.5">{value}</div>
      ) : (
        <MetricScore
          as="p"
          size="md"
          className={cn("mt-1.5 text-foreground", valueClassName)}
        >
          {value}
        </MetricScore>
      )}
      {hint ? (
        <p className="mt-1 text-[12px] leading-snug text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

function recommendationLegendLabel(label: string): string {
  const labels: Record<string, string> = {
    Pursue: "Pursue",
    Consider: "Consider",
    Review: "Review",
    Skip: "Skip",
    // Legacy labels from older analyses
    Strong: "Pursue",
    Good: "Consider",
    Caution: "Review",
    Weak: "Skip",
    "Strong Pursuit": "Pursue",
    "Good Opportunity": "Consider",
    "Proceed With Caution": "Review",
    "Not Recommended": "Skip",
    Unlabeled: "Unlabeled",
  };
  return labels[label] ?? label;
}

function RecommendationDonut({
  stats,
  total,
}: {
  stats: RecommendationStat[];
  total: number;
}) {
  return (
    <div className="flex items-center justify-start gap-4">
      <div className="relative size-[6.25rem] shrink-0">
        <div
          className="size-full rounded-full"
          style={{ background: recommendationConicGradient(stats) }}
          aria-hidden
        />
        <div className="absolute inset-[8%] flex flex-col items-center justify-center rounded-full bg-background text-center">
          <span className="text-[20px] font-semibold tabular-nums leading-none">
            {total}
          </span>
          <span className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
            Total
          </span>
        </div>
      </div>
      <ul className="min-w-0 flex-1 space-y-2">
        {stats.map((item, index) => (
          <li
            key={item.label}
            className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2 text-[12px] leading-tight"
          >
            <span
              className="size-2 shrink-0 rounded-full"
              style={{
                backgroundColor:
                  CHART_SEGMENT_COLORS[index % CHART_SEGMENT_COLORS.length],
              }}
              aria-hidden
            />
            <span className="min-w-0 text-foreground">
              {recommendationLegendLabel(item.label)}
            </span>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {item.pct}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DashboardPanel({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border border-border/70 bg-card/60 p-4 shadow-sm",
        className,
      )}
    >
      <h3 className="text-[12px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
        {title}
      </h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function StatsDashboard({
  analyses,
  stats,
}: {
  analyses: RecentActivityItem[];
  stats: AnalysisStats;
}) {
  const { totalResumeScores, averageResumeScore } = useMemo(() => {
    const resumeItems = analyses.filter(isResumeScoreActivity);
    const scores = resumeItems
      .map((item) => item.resume_score)
      .filter((value): value is number => value != null);

    return {
      totalResumeScores: resumeItems.length,
      averageResumeScore:
        scores.length > 0
          ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
          : null,
    };
  }, [analyses]);

  const overallMatchCategories = useMemo(
    () =>
      computeOverallMatchCategoryAverages(
        analyses.filter((item) => !isResumeScoreActivity(item)),
      ),
    [analyses],
  );

  return (
    <div className="space-y-5 px-4 pb-6">
      <div className="grid grid-cols-2 gap-3">
        <KpiCard
          label="Total Fit Analyses"
          value={String(stats.totalAnalyses)}
        />
        <KpiCard
          label="Total Resume Scores"
          value={String(totalResumeScores)}
        />
        <KpiCard
          label="Avg Fit Analysis Score"
          rawValue
          value={
            stats.averageFit != null ? (
              <FitScoreRatio
                as="p"
                size="md"
                equalParts
                valueOnTen={fitScoreValueOnTen(stats.averageFit)}
                className={scoreColor(stats.averageFit)}
              />
            ) : (
              <MetricScore as="p" size="md" className="text-muted-foreground">
                —
              </MetricScore>
            )
          }
        />
        <KpiCard
          label="Avg Resume Score"
          value={
            averageResumeScore != null
              ? formatResumeReviewScorePercent(averageResumeScore)
              : "—"
          }
          valueClassName={
            averageResumeScore != null
              ? resumeReviewScoreTextClass(averageResumeScore)
              : undefined
          }
        />
      </div>

      <div className="flex flex-col gap-3">
        <DashboardPanel title="Recommendations">
          {stats.recommendationStats.length > 0 ? (
            <RecommendationDonut
              stats={stats.recommendationStats}
              total={stats.totalAnalyses}
            />
          ) : (
            <p className="text-[14px] text-muted-foreground">No breakdown yet.</p>
          )}
        </DashboardPanel>

        <DashboardPanel title="Avg Fit Analysis by Category">
          {stats.totalAnalyses > 0 ? (
            <OverallMatchAnalysisBars categories={overallMatchCategories} />
          ) : (
            <p className="text-[14px] text-muted-foreground">No breakdown yet.</p>
          )}
        </DashboardPanel>
      </div>

      <RecentActivitySection items={analyses} from="/stats" variant="all" />
    </div>
  );
}
