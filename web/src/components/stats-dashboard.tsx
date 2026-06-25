"use client";

import { ReportLink } from "@/components/report-link";
import { MetricScore } from "@/components/ui/metric-score";
import { fitScoreOnTen } from "@/components/qualification-score-circle";
import {
  computeHomeFitStats,
  type AnalysisStats,
  type RecommendationStat,
} from "@/lib/analysis-stats";
import { isNativePlatform } from "@/lib/platform";
import { formatRelativeTimeAgo } from "@/lib/posting-header-meta";
import { scoreColor } from "@/lib/score";
import { cn } from "@/lib/utils";
import type { AnalysisRecord } from "@/lib/types";

const CHART_SEGMENT_COLORS = [
  "var(--color-primary)",
  "color-mix(in oklch, var(--color-primary) 72%, white)",
  "color-mix(in oklch, var(--color-primary) 48%, white)",
  "color-mix(in oklch, var(--color-primary) 28%, white)",
  "color-mix(in oklch, var(--color-primary) 14%, white)",
];

type StatsRow = AnalysisRecord & { report_id: string };

function formatScore(value: number | null): string {
  if (value == null) return "—";
  return String(value);
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
}: {
  label: string;
  value: string;
  hint?: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-card/80 p-3.5 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
        {label}
      </p>
      <MetricScore
        as="p"
        size="md"
        className={cn("mt-1.5 text-foreground", valueClassName)}
      >
        {value}
      </MetricScore>
      {hint ? (
        <p className="mt-1 text-[12px] leading-snug text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

function summarizeRecommendationLabel(label: string): string {
  const shortLabels: Record<string, string> = {
    "Strong Pursuit": "Strong",
    "Good Opportunity": "Good",
    "Proceed With Caution": "Caution",
    "Not Recommended": "Pass",
    Unlabeled: "Other",
  };
  return shortLabels[label] ?? label;
}

function RecommendationDonut({
  stats,
  total,
}: {
  stats: RecommendationStat[];
  total: number;
}) {
  const native = isNativePlatform();

  return (
    <div
      className={cn(
        native
          ? "flex items-center justify-start gap-3"
          : "flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6",
      )}
    >
      <div
        className={cn(
          "relative shrink-0",
          native ? "size-[6.25rem]" : "size-[7.5rem]",
        )}
      >
        <div
          className="size-full rounded-full"
          style={{ background: recommendationConicGradient(stats) }}
          aria-hidden
        />
        <div className="absolute inset-[18%] flex flex-col items-center justify-center rounded-full bg-background text-center">
          <span
            className={cn(
              "font-semibold tabular-nums leading-none",
              native ? "text-[20px]" : "text-[22px]",
            )}
          >
            {total}
          </span>
          <span className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
            Total
          </span>
        </div>
      </div>
      <ul
        className={cn(
          "min-w-0 flex-1",
          native ? "space-y-1.5" : "space-y-2",
        )}
      >
        {stats.map((item, index) => (
          <li
            key={item.label}
            className={cn(
              "flex items-center gap-2",
              native ? "text-[12px] leading-tight" : "text-[13px]",
            )}
          >
            <span
              className="size-2 shrink-0 rounded-full"
              style={{
                backgroundColor:
                  CHART_SEGMENT_COLORS[index % CHART_SEGMENT_COLORS.length],
              }}
              aria-hidden
            />
            <span className="min-w-0 flex-1 truncate">
              {native
                ? summarizeRecommendationLabel(item.label)
                : item.label}
            </span>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {native ? `${item.pct}%` : `${item.count} · ${item.pct}%`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ScoreAverageBars({
  averageFit,
  averageQualification,
  averageConfidence,
}: {
  averageFit: number | null;
  averageQualification: number | null;
  averageConfidence: number | null;
}) {
  const items = [
    { label: "Fit", value: averageFit },
    { label: "Qualification", value: averageQualification },
    { label: "Confidence", value: averageConfidence },
  ];

  return (
    <div className="space-y-3.5">
      {items.map((item) => (
        <div key={item.label} className="space-y-1.5">
          <div className="flex items-center justify-between gap-3 text-[13px]">
            <span className="text-muted-foreground">{item.label}</span>
            <span
              className={cn(
                "font-semibold tabular-nums",
                item.value != null ? scoreColor(item.value) : "text-muted-foreground",
              )}
            >
              {formatScore(item.value)}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${Math.max(0, Math.min(100, item.value ?? 0))}%` }}
            />
          </div>
        </div>
      ))}
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

function AnalysisTable({ rows }: { rows: StatsRow[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border/70 bg-card/60 shadow-sm">
      <div className="border-b border-border/60 px-4 py-2.5">
        <h3 className="text-[12px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
          Recent analyses
        </h3>
      </div>
      <div className="overflow-x-auto">
        <div
          className="grid min-w-[20rem] grid-cols-[minmax(0,1fr)_2.75rem_2.75rem_minmax(4.5rem,1fr)] gap-x-1 border-b border-border/60 bg-muted/25 px-3 py-2 text-[11px] uppercase tracking-wide text-muted-foreground"
          role="row"
        >
          <span role="columnheader">Role</span>
          <span role="columnheader" className="text-right">
            Fit
          </span>
          <span role="columnheader" className="text-right">
            Qual
          </span>
          <span role="columnheader">Rec</span>
        </div>
        {rows.map((row) => {
          const fit = row.fit_score ?? 0;
          const qual = row.qualification_score;
          return (
            <ReportLink
              key={row.id}
              analysis={row}
              from="/stats"
              className="grid min-w-[20rem] grid-cols-[minmax(0,1fr)_2.75rem_2.75rem_minmax(4.5rem,1fr)] gap-x-1 border-b border-border/40 px-3 py-2.5 text-[13px] last:border-0 transition-colors hover:bg-muted/20 active:bg-muted/30"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">
                  {row.job_title ?? "Untitled role"}
                </p>
                <p className="truncate text-[12px] text-muted-foreground">
                  {[row.company_name, formatRelativeTimeAgo(row.created_at)]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <span
                className={cn(
                  "text-right tabular-nums self-center",
                  scoreColor(fit),
                )}
              >
                {fitScoreOnTen(fit)}
              </span>
              <span className="text-right tabular-nums text-muted-foreground self-center">
                {formatScore(qual)}
              </span>
              <span className="line-clamp-2 text-[12px] leading-snug text-muted-foreground self-center">
                {row.recommendation_label ?? "—"}
              </span>
            </ReportLink>
          );
        })}
      </div>
    </div>
  );
}

export function StatsDashboard({
  analyses,
  stats,
}: {
  analyses: StatsRow[];
  stats: AnalysisStats;
}) {
  const homeStats = computeHomeFitStats(analyses);
  const tableRows = analyses.slice(0, 12);

  return (
    <div className="space-y-5 px-4 pb-6">
      <div className="grid grid-cols-2 gap-3">
        <KpiCard label="Total analyses" value={String(stats.totalAnalyses)} />
        <KpiCard
          label="Avg fit score"
          value={formatScore(stats.averageFit)}
          valueClassName={
            stats.averageFit != null ? scoreColor(stats.averageFit) : undefined
          }
        />
        <KpiCard
          label="OnlyFit rate"
          value={`${homeStats.onlyFitPercent}%`}
          hint={`${homeStats.onlyFitCount} at 9.0+`}
        />
        <KpiCard
          label="Saved"
          value={String(stats.savedCount)}
          hint="Bookmarked roles"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
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

        <DashboardPanel title="Score averages">
          <ScoreAverageBars
            averageFit={stats.averageFit}
            averageQualification={stats.averageQualification}
            averageConfidence={stats.averageConfidence}
          />
        </DashboardPanel>
      </div>

      {tableRows.length > 0 ? <AnalysisTable rows={tableRows} /> : null}
    </div>
  );
}
