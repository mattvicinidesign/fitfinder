import type { AnalysisRecord } from "@/lib/types";

/** Display scale 0–10 = fit_score ÷ 100 stored as 0–100. */
export const ONLY_FIT_SCORE_MIN = 90;

export interface HomeFitStats {
  averageFitOnTen: number | null;
  onlyFitCount: number;
  onlyFitPercent: number;
  analyzedCount: number;
  /** e.g. "June 17, 2026" from the most recent analysis — shown as "Updated …" on home. */
  lastAnalysisDateLabel: string | null;
}

export interface RecommendationStat {
  label: string;
  count: number;
  pct: number;
}

export interface AnalysisStats {
  totalAnalyses: number;
  savedCount: number;
  averageFit: number | null;
  averageQualification: number | null;
  averageConfidence: number | null;
  recommendationStats: RecommendationStat[];
}

function average(values: number[]): number | null {
  if (!values.length) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function formatLastAnalysisDateLabel(
  analyses: AnalysisRecord[],
): string | null {
  let latestIso: string | null = null;
  let latestTime = Number.NEGATIVE_INFINITY;

  for (const row of analyses) {
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

/** Home hero metrics — average fit (0–10) and OnlyFit share across analyzed jobs. */
export function computeHomeFitStats(analyses: AnalysisRecord[]): HomeFitStats {
  const fitScores = analyses
    .map((row) => row.fit_score)
    .filter((value): value is number => value != null);

  let onlyFitCount = 0;
  for (const score of fitScores) {
    if (score >= ONLY_FIT_SCORE_MIN) onlyFitCount++;
  }

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
    onlyFitCount,
    onlyFitPercent:
      analyzedCount > 0 ? Math.round((onlyFitCount / analyzedCount) * 100) : 0,
    analyzedCount,
    lastAnalysisDateLabel: formatLastAnalysisDateLabel(analyses),
  };
}

/** Aggregate headline metrics from analysis rows. */
export function computeAnalysisStats(
  analyses: AnalysisRecord[],
  savedCount: number,
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
  const recommendationStats = [...labelCounts.entries()]
    .map(([label, count]) => ({
      label,
      count,
      pct: total > 0 ? Math.round((count / total) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    totalAnalyses: total,
    savedCount,
    averageFit: average(fitScores),
    averageQualification: average(qualificationScores),
    averageConfidence: average(confidenceScores),
    recommendationStats,
  };
}
