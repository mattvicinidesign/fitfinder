import type { ResumeReviewResult } from "@/lib/types";

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
            explanation: "Keyword optimization applied for stronger ATS recognition.",
          }
        : category,
    ),
  };
}
