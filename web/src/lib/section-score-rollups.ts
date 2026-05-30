/**
 * Scoring category rollups — partial scores per category card toward the global score.
 * Category weights (of overall 100): Qualifications 50, Role 25, Client Profile 15, Preferences 10.
 * Within each category, identified scoring items are weighted equally (see equalWeightSectionSubtotal).
 * Global score = weighted sum of category subtotals (renormalized when a category is unknown).
 */

import type { PostingDetailHighlightContext } from "@/lib/posting-detail-highlights";
import type { PostingDetailRow } from "@/lib/posting-details";
import {
  buildSectionFields,
  equalWeightSectionSubtotal,
  type SectionFieldScoreContext,
} from "@/lib/section-field-scoring";
import {
  SCORING_CATEGORY_LABELS,
  SCORING_CATEGORY_WEIGHTS,
  type ReportSectionId,
  type ScoringCategoryId,
} from "@/lib/scoring-terminology";
import type { CategoryScore } from "@/lib/types";

export type { ReportSectionId, ScoringCategoryId } from "@/lib/scoring-terminology";

/** @deprecated Use SCORING_CATEGORY_WEIGHTS from scoring-terminology */
export const REPORT_SECTION_WEIGHTS = SCORING_CATEGORY_WEIGHTS;

export interface ReportSectionRollup {
  id: ReportSectionId;
  title: string;
  /** 0–100 partial score, or null when no identified items in this category. */
  score: number | null;
}

const REGISTERED_SECTION_IDS: ReportSectionId[] = [
  "clientProfile",
  "clientPreferences",
  "roleDetails",
  "categoryMatching",
];

const GUEST_SECTION_IDS: ReportSectionId[] = [
  "clientPreferences",
  "roleDetails",
  "categoryMatching",
];

export interface ReportRollupOptions {
  fieldContext: SectionFieldScoreContext;
  postingRows: PostingDetailRow[];
  highlightCtx: PostingDetailHighlightContext;
}

function rollupScoreForCategory(
  sectionId: ReportSectionId,
  options: ReportRollupOptions,
): number | null {
  const fields = buildSectionFields(
    sectionId,
    options.fieldContext,
    options.postingRows,
    options.highlightCtx,
  );
  return equalWeightSectionSubtotal(fields);
}

export function computeReportSectionRollups(
  breakdown: CategoryScore[],
  isGuest: boolean,
  options: ReportRollupOptions,
): ReportSectionRollup[] {
  const sectionIds = isGuest ? GUEST_SECTION_IDS : REGISTERED_SECTION_IDS;

  return sectionIds.map((id) => ({
    id,
    title: SCORING_CATEGORY_LABELS[id],
    score: rollupScoreForCategory(id, options),
  }));
}

/** Partial score for one scoring category (equal-weight identified items). */
export function sectionRollupScore(
  breakdown: CategoryScore[],
  isGuest: boolean,
  sectionId: ReportSectionId,
  options: ReportRollupOptions,
): number | null {
  return rollupScoreForCategory(sectionId, options);
}

/**
 * Global score (0–100) from scoring category subtotals and SCORING_CATEGORY_WEIGHTS.
 * Unknown categories are omitted; remaining weights renormalize to 100%.
 */
export function computeWeightedReportScore(
  breakdown: CategoryScore[],
  isGuest: boolean,
  options: ReportRollupOptions,
): number | null {
  const rollups = computeReportSectionRollups(breakdown, isGuest, options);
  let weighted = 0;
  let totalWeight = 0;

  for (const { id, score } of rollups) {
    if (score == null) continue;
    const w = SCORING_CATEGORY_WEIGHTS[id];
    weighted += score * w;
    totalWeight += w;
  }

  if (totalWeight === 0) return null;
  return Math.round(weighted / totalWeight);
}
