import type { AnalysisRecord, OpportunityCategoryKey } from "@/lib/types";
import { formatRelativeTimeAgo } from "@/lib/posting-header-meta";
import { loadAnalysisReport } from "@/lib/analysis-report-cache";
import { OVERALL_MATCH_CATEGORY_ORDER } from "@/lib/opportunity-categories";
import { OPPORTUNITY_CATEGORY_LABELS } from "@/lib/scoring-terminology";
import { resolveOverallMatchRollupsFromCacheEntry } from "@/lib/report-display-score";

export interface HomeFitStats {
  averageFitOnTen: number | null;
  analyzedCount: number;
  /** e.g. "0 days ago", "11 minutes ago" — hero subtitle under avg fit. */
  lastActivityAgoLabel: string;
}

export interface RecommendationStat {
  label: string;
  count: number;
  pct: number;
}

export interface AnalysisStats {
  totalAnalyses: number;
  strongPursuitCount: number;
  averageFit: number | null;
  averageQualification: number | null;
  averageConfidence: number | null;
  recommendationStats: RecommendationStat[];
}

export type OverallMatchCategoryAverage = {
  id: OpportunityCategoryKey;
  label: string;
  /** 0–100 category score average across fit analyses. */
  averageScore: number | null;
};

function average(values: number[]): number | null {
  if (!values.length) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export function formatLatestActivityAgoLabel(
  items: Pick<AnalysisRecord, "created_at">[],
): string {
  if (items.length === 0) return "0 days ago";

  let latestIso: string | null = null;
  let latestTime = Number.NEGATIVE_INFINITY;

  for (const row of items) {
    if (!row.created_at) continue;
    const time = new Date(row.created_at).getTime();
    if (Number.isNaN(time) || time <= latestTime) continue;
    latestTime = time;
    latestIso = row.created_at;
  }

  if (!latestIso) return "0 days ago";

  return formatRelativeTimeAgo(latestIso)?.toLowerCase() ?? "0 days ago";
}

export function formatLatestActivityDateLabel(
  items: Pick<AnalysisRecord, "created_at">[],
): string | null {
  let latestIso: string | null = null;
  let latestTime = Number.NEGATIVE_INFINITY;

  for (const row of items) {
    if (!row.created_at) continue;
    const time = new Date(row.created_at).getTime();
    if (Number.isNaN(time) || time <= latestTime) continue;
    latestTime = time;
    latestIso = row.created_at;
  }

  if (!latestIso) return null;

  const date = new Date(latestIso);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

/** Home hero metrics — average fit (0–10) across analyzed jobs. */
export function computeHomeFitStats(analyses: AnalysisRecord[]): HomeFitStats {
  const fitScores = analyses
    .map((row) => row.fit_score)
    .filter((value): value is number => value != null);

  const analyzedCount = analyses.length;
  const averageFitOnTen =
    fitScores.length > 0
      ? Math.round(
          (fitScores.reduce((sum, score) => sum + score, 0) /
            fitScores.length /
            10) *
            10,
        ) / 10
      : null;

  return {
    averageFitOnTen,
    analyzedCount,
    lastActivityAgoLabel: "0 days ago",
  };
}

/** Average Overall Match category scores across cached fit analyses. */
export function computeOverallMatchCategoryAverages(
  fitAnalyses: (Pick<AnalysisRecord, "id"> & { report_id?: string })[],
): OverallMatchCategoryAverage[] {
  const sums = new Map<OpportunityCategoryKey, number>();
  const counts = new Map<OpportunityCategoryKey, number>();

  for (const item of fitAnalyses) {
    const reportId = item.report_id?.trim() || item.id;
    const entry = loadAnalysisReport(reportId);
    if (!entry) continue;

    const rollups = resolveOverallMatchRollupsFromCacheEntry(entry);
    for (const row of rollups) {
      const id = row.id as OpportunityCategoryKey;
      if (!OVERALL_MATCH_CATEGORY_ORDER.includes(id)) continue;
      if (row.score == null) continue;
      sums.set(id, (sums.get(id) ?? 0) + row.score);
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }

  return OVERALL_MATCH_CATEGORY_ORDER.map((id) => {
    const count = counts.get(id) ?? 0;
    return {
      id,
      label: OPPORTUNITY_CATEGORY_LABELS[id],
      averageScore:
        count > 0 ? Math.round((sums.get(id) ?? 0) / count) : null,
    };
  });
}

/** Aggregate headline metrics from analysis rows. */
export function computeAnalysisStats(
  analyses: AnalysisRecord[],
): AnalysisStats {
  const fitScores = analyses
    .map((row) => row.fit_score)
    .filter((value): value is number => value != null);
  const qualificationScores = analyses
    .map((row) => row.qualification_score)
    .filter((value): value is number => value != null);
  const confidenceScores = analyses
    .map((row) => row.confidence_score)
    .filter((value): value is number => value != null);

  const labelCounts = new Map<string, number>();
  for (const row of analyses) {
    const label = row.recommendation_label?.trim() || "Unlabeled";
    labelCounts.set(label, (labelCounts.get(label) ?? 0) + 1);
  }

  const total = analyses.length;
  const strongPursuitCount = analyses.filter(
    (row) => row.recommendation_label?.trim() === "Strong Pursuit",
  ).length;
  const recommendationStats = [...labelCounts.entries()]
    .map(([label, count]) => ({
      label,
      count,
      pct: total > 0 ? Math.round((count / total) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    totalAnalyses: total,
    strongPursuitCount,
    averageFit: average(fitScores),
    averageQualification: average(qualificationScores),
    averageConfidence: average(confidenceScores),
    recommendationStats,
  };
}
