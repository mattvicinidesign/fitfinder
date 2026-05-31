/**
 * Canonical qualification report terminology:
 *
 * - **Global score** — 0–10 ring + recommendation (e.g. 9.4/10 Highly Recommended)
 * - **Scoring category** — card sections (Client Profile, Role Details, …)
 * - **Scoring item** — one row inside a category (e.g. Timezone → America/Los Angeles).
 *   Identified items in a category are weighted equally toward that category’s subtotal.
 *   In Qualifications, each skill/tool keyword from the posting is one item (equal weight).
 */

/** Scoring category id (Client Profile, Role Details, …). */
export type ScoringCategoryId =
  | "clientProfile"
  | "clientPreferences"
  | "roleDetails"
  | "categoryMatching";

/** @alias ScoringCategoryId */
export type ReportSectionId = ScoringCategoryId;

export const GLOBAL_SCORE_LABEL = "Profile Fit";

/** Footer row on a scoring category card (equal-weight item average). */
export const SCORING_CATEGORY_SUBTOTAL_LABEL = "Matching Items";

/** Display titles for each scoring category card and global-score rollup row. */
export const SCORING_CATEGORY_LABELS: Record<ScoringCategoryId, string> = {
  clientProfile: "Client",
  clientPreferences: "Preference",
  roleDetails: "Role",
  categoryMatching: "Qualification",
};

/** Share of global score per scoring category (sums to 100). */
export const SCORING_CATEGORY_WEIGHTS: Record<ScoringCategoryId, number> = {
  categoryMatching: 50,
  roleDetails: 25,
  clientProfile: 15,
  clientPreferences: 10,
};

export function scoringCategoryTitle(id: ScoringCategoryId): string {
  return SCORING_CATEGORY_LABELS[id];
}

/**
 * Display-only category score on a 0–10 scale: (matchedItems / totalItems) * 10.
 * Not used by the recommendation engine — presentation only.
 */
export function categoryScoreOutOfTen(
  fraction: { matched: number; total: number } | null | undefined,
): string | null {
  if (!fraction || fraction.total <= 0) return null;
  return ((fraction.matched / fraction.total) * 10).toFixed(1);
}

/** Accessible label for a scoring item (title + value pill). */
export function scoringItemAriaLabel(title: string, badgeLabel: string): string {
  return `${title}: ${badgeLabel}`;
}

/** Accessible label for the 0–10 global score ring. */
export function globalScoreAriaLabel(displayOnTen: string, recommendation?: string): string {
  const base = `Global score ${displayOnTen} out of 10`;
  return recommendation?.trim() ? `${base}, ${recommendation}` : base;
}
