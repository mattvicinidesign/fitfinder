import { clientQualityScoreFromPostingDetails } from "@/lib/client-quality-scoring";
import type { ReportRollupOptions } from "@/lib/section-score-rollups";
import {
  computeReportSectionRollups,
  reportSectionOrder,
} from "@/lib/section-score-rollups";
import {
  buildQualificationsFields,
  buildClientPreferencesFields,
  buildRoleDetailsFields,
  equalWeightSectionSubtotal,
} from "@/lib/section-field-scoring";
import {
  OPPORTUNITY_CATEGORY_LABELS,
  OPPORTUNITY_CATEGORY_WEIGHTS,
  SCORING_CATEGORY_LABELS,
  SCORING_CATEGORY_WEIGHTS,
  type ScoringCategoryId,
} from "@/lib/scoring-terminology";
import { formatScoreOnTen } from "@/lib/use-score-reveal";
import type {
  OpportunityCategoryKey,
  OpportunityCategoryScore,
  ScoreResult,
} from "@/lib/types";

/** Overall Match display order for registered users (mirrors report section cards). */
export const OVERALL_MATCH_CATEGORY_ORDER: OpportunityCategoryKey[] = [
  "clientQuality",
  "roleAlignment",
  "qualificationsMatch",
  "preferenceAlignment",
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
  if (sectionId === "clientProfile") {
    return OPPORTUNITY_CATEGORY_LABELS.clientQuality;
  }
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
  const ctx = rollupOptions.fieldContext;

  if (sectionId === "clientProfile") {
    const fromDetails = clientQualityScoreFromPostingDetails(
      ctx.parsedJob?.postingDetails,
      ctx.profileDesiredCompensation ?? ctx.parsedResume?.desiredCompensation ?? null,
      {
        companyName: ctx.companyName,
        jobDescription: ctx.jobDescription,
        employerType:
          ctx.postingContext?.employerType ?? ctx.parsedJob?.employerType ?? null,
      },
    );
    if (fromDetails != null) return fromDetails;
  }

  if (sectionId === "categoryMatching") {
    const fromFields = equalWeightSectionSubtotal(buildQualificationsFields(ctx));
    if (fromFields != null) return fromFields;
  }

  if (sectionId === "roleDetails") {
    const fromFields = equalWeightSectionSubtotal(
      buildRoleDetailsFields(
        ctx,
        rollupOptions.postingRows,
        rollupOptions.highlightCtx,
      ),
    );
    if (fromFields != null) return fromFields;
  }

  if (sectionId === "clientPreferences") {
    const fromFields = equalWeightSectionSubtotal(buildClientPreferencesFields(ctx));
    if (fromFields != null) return fromFields;
  }

  if (usesOpportunityEngine(score)) {
    const engineScore = getOpportunityCategoryScore(
      score,
      LEGACY_SECTION_TO_OPPORTUNITY[sectionId],
    );
    if (engineScore != null) return engineScore;
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
  const isGuest = score.scoringMode === "guest";

  return reportSectionOrder(isGuest).map((sectionId) => ({
    id: LEGACY_SECTION_TO_OPPORTUNITY[sectionId],
    title: scoringCategoryTitleForScore(sectionId, score),
    score: sectionCategoryScore(score, sectionId, rollupOptions),
  }));
}

const OVERALL_MATCH_WEIGHTS: Partial<
  Record<OpportunityCategoryKey, number>
> = {
  clientQuality: SCORING_CATEGORY_WEIGHTS.clientProfile,
  preferenceAlignment: SCORING_CATEGORY_WEIGHTS.clientPreferences,
  roleAlignment: SCORING_CATEGORY_WEIGHTS.roleDetails,
  qualificationsMatch: SCORING_CATEGORY_WEIGHTS.categoryMatching,
};

/** Weighted Overall Match ring from the same category rows shown in the card. */
export function computeOverallMatchFitScore(
  rollups: OverallMatchRollupRow[],
): number | null {
  let weighted = 0;
  let totalWeight = 0;

  for (const row of rollups) {
    if (row.score == null) continue;
    const weight = OVERALL_MATCH_WEIGHTS[row.id as OpportunityCategoryKey];
    if (weight == null) continue;
    weighted += row.score * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) return null;
  return Math.round(weighted / totalWeight);
}
