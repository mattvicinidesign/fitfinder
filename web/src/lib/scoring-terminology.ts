/**
 * Canonical qualification report terminology:
 *
 * - **Overall Match** — 0–10 ring + recommendation (e.g. 8.7 Strong Pursuit)
 * - **Opportunity category** — Role Alignment, Qualifications, Preferences, …
 * - **Scoring item** — one row inside a legacy category card (V1 UI only).
 */

import type { OpportunityCategoryKey } from "@/lib/types";

/** Legacy scoring category id (Client Profile, Role Details, …). */
export type ScoringCategoryId =
  | "clientProfile"
  | "clientPreferences"
  | "roleDetails"
  | "categoryMatching";

/** @alias ScoringCategoryId */
export type ReportSectionId = ScoringCategoryId;

export const GLOBAL_SCORE_LABEL = "Overall Match";

/** Footer row on a scoring category card (equal-weight item average). */
export const SCORING_CATEGORY_SUBTOTAL_LABEL = "Category Score";

/** Display titles for legacy V1 scoring category cards. */
export const SCORING_CATEGORY_LABELS: Record<ScoringCategoryId, string> = {
  clientProfile: "Client Quality",
  clientPreferences: "Preference",
  roleDetails: "Role",
  categoryMatching: "Qualification",
};

/** Opportunity Engine category labels (primary). */
export const OPPORTUNITY_CATEGORY_LABELS = {
  roleAlignment: "Role Alignment",
  qualificationsMatch: "Qualifications",
  industryAlignment: "Industry",
  preferenceAlignment: "Preferences",
  clientQuality: "Client Quality",
} as const satisfies Record<OpportunityCategoryKey, string>;

/** Opportunity Engine weights (sum = 100). */
export const OPPORTUNITY_CATEGORY_WEIGHTS = {
  roleAlignment: 35,
  qualificationsMatch: 30,
  industryAlignment: 15,
  preferenceAlignment: 10,
  clientQuality: 10,
} as const;

export const GLOBAL_SCORE_INFO =
  "Your overall career fit for this role. Role alignment and qualifications drive the score; preferences and client quality fine-tune the result.";

export const SCORING_CATEGORY_INFO: Record<ScoringCategoryId, string> = {
  clientProfile:
    "Client quality from About the client — location, rating, and average pay rate. Each item found counts equally toward the category score. Registered users only.",
  clientPreferences:
    "How well you match the client preferences — location, timezone, talent type, and AI emphasis stated in the posting.",
  roleDetails:
    "How well the role fits — title for guest users; title, pay, hours, and duration when signed in.",
  categoryMatching:
    "How many of the posting's required skills and tools you match. Every keyword is weighted equally.",
};

/** Legacy V1 weights — used only when opportunityCategories is absent. */
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
  const score = (fraction.matched / fraction.total) * 10;
  return Number.isInteger(score) ? String(score) : score.toFixed(1);
}

/** Accessible label for a scoring item (title + value pill). */
export function scoringItemAriaLabel(title: string, badgeLabel: string): string {
  return `${title}: ${badgeLabel}`;
}

/** Accessible label for the 0–10 global score ring. */
export function globalScoreAriaLabel(displayOnTen: string, recommendation?: string): string {
  const base = `Overall match ${displayOnTen} out of 10`;
  return recommendation?.trim() ? `${base}, ${recommendation}` : base;
}
