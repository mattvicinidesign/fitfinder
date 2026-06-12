import type { ReportRollupOptions } from "@/lib/section-score-rollups";
import { computeReportSectionRollups } from "@/lib/section-score-rollups";
import {
  OPPORTUNITY_CATEGORY_LABELS,
  OPPORTUNITY_CATEGORY_WEIGHTS,
  SCORING_CATEGORY_LABELS,
  type ScoringCategoryId,
} from "@/lib/scoring-terminology";
import { formatScoreOnTen } from "@/lib/use-score-reveal";
import type {
  OpportunityCategoryKey,
  OpportunityCategoryScore,
  ScoreResult,
} from "@/lib/types";

/** Categories shown in Overall Match (industry is scored by the engine but not listed). */
export const OVERALL_MATCH_CATEGORY_ORDER: OpportunityCategoryKey[] = [
  "roleAlignment",
  "qualificationsMatch",
  "preferenceAlignment",
  "clientQuality",
];

/** Full engine category order (includes industry for normalization/debug). */
export const OPPORTUNITY_CATEGORY_ORDER: OpportunityCategoryKey[] = [
  ...OVERALL_MATCH_CATEGORY_ORDER.slice(0, 2),
  "industryAlignment",
  ...OVERALL_MATCH_CATEGORY_ORDER.slice(2),
];

/** Legacy scoring category cards → Overall Match opportunity category. */
export const LEGACY_SECTION_TO_OPPORTUNITY: Record<
  ScoringCategoryId,
  OpportunityCategoryKey
> = {
  roleDetails: "roleAlignment",
  categoryMatching: "qualificationsMatch",
  clientPreferences: "preferenceAlignment",
  clientProfile: "clientQuality",
};

export function usesOpportunityEngine(score: ScoreResult): boolean {
  return (score.opportunityCategories?.length ?? 0) > 0;
}

export function opportunityCategoryLabel(key: OpportunityCategoryKey): string {
  return OPPORTUNITY_CATEGORY_LABELS[key];
}

/** Normalize API rows: canonical label, weight, and stable order. */
export function normalizeOpportunityCategories(
  categories: OpportunityCategoryScore[],
): OpportunityCategoryScore[] {
  const byKey = new Map<OpportunityCategoryKey, OpportunityCategoryScore>();

  for (const row of categories) {
    const key = row.category;
    if (!OPPORTUNITY_CATEGORY_ORDER.includes(key)) continue;
    byKey.set(key, {
      ...row,
      category: key,
      label: opportunityCategoryLabel(key),
      weight: OPPORTUNITY_CATEGORY_WEIGHTS[key],
    });
  }

  return OPPORTUNITY_CATEGORY_ORDER.map((key) => byKey.get(key)).filter(
    (row): row is OpportunityCategoryScore => row != null,
  );
}

export function getOpportunityCategoryMap(
  score: ScoreResult,
): Map<OpportunityCategoryKey, OpportunityCategoryScore> {
  const rows = normalizeOpportunityCategories(score.opportunityCategories ?? []);
  return new Map(rows.map((row) => [row.category, row]));
}

export function getOpportunityCategoryScore(
  score: ScoreResult,
  key: OpportunityCategoryKey,
): number | null {
  const row = getOpportunityCategoryMap(score).get(key);
  return row?.score ?? null;
}

/** Title for a legacy scoring category card — matches Overall Match when using the engine. */
export function scoringCategoryTitleForScore(
  sectionId: ScoringCategoryId,
  score: ScoreResult,
): string {
  if (!usesOpportunityEngine(score)) {
    return SCORING_CATEGORY_LABELS[sectionId];
  }
  return opportunityCategoryLabel(LEGACY_SECTION_TO_OPPORTUNITY[sectionId]);
}

/** Category score (0–100) for a legacy section card footer — matches Overall Match row. */
export function sectionCategoryScore(
  score: ScoreResult,
  sectionId: ScoringCategoryId,
  rollupOptions: ReportRollupOptions,
): number | null {
  if (usesOpportunityEngine(score)) {
    return getOpportunityCategoryScore(
      score,
      LEGACY_SECTION_TO_OPPORTUNITY[sectionId],
    );
  }

  const isGuest = score.scoringMode === "guest";
  const rollup = computeReportSectionRollups(
    score.categoryBreakdown,
    isGuest,
    rollupOptions,
  ).find((row) => row.id === sectionId);
  return rollup?.score ?? null;
}

export function formatCategoryScoreOnTen(scorePercent: number | null): string {
  if (scorePercent == null) return "—";
  return formatScoreOnTen(scorePercent / 10);
}

export interface OverallMatchRollupRow {
  id: string;
  title: string;
  /** Category score 0–100. */
  score: number | null;
}

export function buildOverallMatchRollups(
  score: ScoreResult,
  rollupOptions: ReportRollupOptions,
): OverallMatchRollupRow[] {
  if (usesOpportunityEngine(score)) {
    return normalizeOpportunityCategories(score.opportunityCategories ?? [])
      .filter((row) => row.category !== "industryAlignment")
      .map((row) => ({
        id: row.category,
        title: row.label,
        score: row.score,
      }));
  }

  const isGuest = score.scoringMode === "guest";
  return computeReportSectionRollups(
    score.categoryBreakdown,
    isGuest,
    rollupOptions,
  ).map((section) => ({
    id: section.id,
    title: section.title,
    score: section.score,
  }));
}
