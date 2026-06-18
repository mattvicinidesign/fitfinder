import type { ResumeReviewResult } from "@/lib/types";

const SUMMARY_MAX_WORDS = 11;
const CATEGORY_EXPLANATION_MAX_WORDS = 8;

function collapseWhitespace(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

/** Keep the first sentence, then cap word count — no ellipsis. */
export function shortenResumeReviewCopy(text: string, maxWords: number): string {
  const cleaned = collapseWhitespace(text);
  if (!cleaned) return cleaned;

  const firstSentence =
    cleaned.split(/(?<=[.!?])\s+/)[0]?.trim() ?? cleaned;
  const words = firstSentence.split(/\s+/).filter(Boolean);

  if (words.length <= maxWords) {
    return words.join(" ");
  }

  return words.slice(0, maxWords).join(" ");
}

export function compactResumeReviewCopy(
  review: ResumeReviewResult,
): ResumeReviewResult {
  const summary = shortenResumeReviewCopy(review.summary, SUMMARY_MAX_WORDS);
  const categories = review.categories.map((category) => ({
    ...category,
    explanation: shortenResumeReviewCopy(
      category.explanation,
      CATEGORY_EXPLANATION_MAX_WORDS,
    ),
  }));

  const unchanged =
    summary === review.summary &&
    categories.every(
      (category, index) =>
        category.explanation === review.categories[index]?.explanation,
    );

  if (unchanged) return review;

  return {
    ...review,
    summary,
    categories,
  };
}
