/**
 * Shared Fit Score weight helpers for Edge Functions.
 * Keep presets/defaults aligned with web/src/lib/match-score-weights.ts.
 */

import type { SemanticCategoryKey } from "./semantic_match/types.ts";
import { SEMANTIC_CATEGORY_WEIGHTS } from "./semantic_match/types.ts";

export type MatchScoreWeights = Record<SemanticCategoryKey, number>;

const KEYS = Object.keys(SEMANTIC_CATEGORY_WEIGHTS) as SemanticCategoryKey[];
const MIN = 5;
const MAX = 70;
const TOTAL = 100;

export const DEFAULT_MATCH_SCORE_WEIGHTS: MatchScoreWeights = {
  ...SEMANTIC_CATEGORY_WEIGHTS,
};

function isValid(weights: MatchScoreWeights): boolean {
  const sum = KEYS.reduce((acc, key) => acc + weights[key], 0);
  if (sum !== TOTAL) return false;
  return KEYS.every(
    (key) =>
      Number.isFinite(weights[key]) &&
      weights[key] >= MIN &&
      weights[key] <= MAX,
  );
}

export function normalizeMatchScoreWeights(
  value: unknown,
): MatchScoreWeights | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const next = { ...DEFAULT_MATCH_SCORE_WEIGHTS };

  for (const key of KEYS) {
    const raw = record[key];
    if (typeof raw !== "number" || !Number.isFinite(raw)) return null;
    next[key] = Math.round(raw);
  }

  return isValid(next) ? next : null;
}

export function resolveMatchScoreWeights(
  value: unknown,
): MatchScoreWeights {
  return normalizeMatchScoreWeights(value) ?? { ...DEFAULT_MATCH_SCORE_WEIGHTS };
}
