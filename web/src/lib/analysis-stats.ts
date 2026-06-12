import type { AnalysisRecord } from "@/lib/types";

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
