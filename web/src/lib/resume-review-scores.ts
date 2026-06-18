import type { ResumeReviewResult } from "@/lib/types";
import { compactResumeReviewCopy } from "@/lib/resume-review-copy";

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function rescaleScoresToPercent(scores: number[]): number[] {
  if (scores.length === 0) return scores;
  const max = Math.max(...scores);
  const hasPositive = scores.some((score) => score > 0);
  const allOnTenScale = hasPositive && max <= 10;

  if (allOnTenScale) {
    return scores.map((score) => clampScore(score * 10));
  }

  return scores.map((score) =>
    score > 0 && score <= 10 ? clampScore(score * 10) : clampScore(score),
  );
}

/** Fix cached reviews where the model returned 0–10 instead of 0–100. */
export function normalizeResumeReviewScores(
  review: ResumeReviewResult,
): ResumeReviewResult {
  const withCopy = compactResumeReviewCopy(review);
  const rawScores = [
    withCopy.overallScore,
    ...withCopy.categories.map((category) => category.score),
  ];
  const scaled = rescaleScoresToPercent(rawScores);
  const [overallScore, ...categoryScores] = scaled;

  const categories = withCopy.categories.map((category, index) => ({
    ...category,
    score: categoryScores[index] ?? category.score,
  }));

  return {
    ...withCopy,
    overallScore,
    categories,
  };
}

/** Master score shown in the report hero — average of category percentages. */
export function getResumeReviewMasterScore(review: ResumeReviewResult): number {
  if (review.categories.length === 0) {
    return clampScore(review.overallScore);
  }
  const sum = review.categories.reduce(
    (total, category) => total + category.score,
    0,
  );
  return clampScore(sum / review.categories.length);
}
