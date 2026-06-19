import type { ResumeReviewResult } from "@/lib/types";

/** Short ATS card copy after keyword optimization — must stay on one line. */
export const ATS_OPTIMIZED_CATEGORY_EXPLANATION = "ATS keywords optimized.";

/** Update only the ATS category score after keyword optimization. */
export function patchResumeReviewAtsScore(
  review: ResumeReviewResult,
  optimizedATSScore: number,
): ResumeReviewResult {
  return {
    ...review,
    categories: review.categories.map((category) =>
      category.key === "ats"
        ? {
            ...category,
            score: optimizedATSScore,
            explanation: ATS_OPTIMIZED_CATEGORY_EXPLANATION,
          }
        : category,
    ),
  };
}
