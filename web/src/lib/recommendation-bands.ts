/**
 * Fit score recommendation bands — keep in sync with
 * supabase/functions/_shared/scoring_constants.ts RECOMMENDATION_BANDS
 *
 * Display scale 0–10 = fitScore ÷ 100.
 */

import type { Recommendation } from "@/lib/types";

export const RECOMMENDATION_BANDS: {
  min: number;
  recommendation: Recommendation;
  label: string;
}[] = [
  { min: 85, recommendation: "strong_apply", label: "Strong Pursuit" },
  { min: 70, recommendation: "apply", label: "Good Opportunity" },
  { min: 50, recommendation: "stretch", label: "Proceed With Caution" },
  { min: 0, recommendation: "not_recommended", label: "Not Recommended" },
];

export function recommendFromFitScore(fitScore: number): {
  recommendation: Recommendation;
  label: string;
} {
  for (const band of RECOMMENDATION_BANDS) {
    if (fitScore >= band.min) {
      return { recommendation: band.recommendation, label: band.label };
    }
  }
  return RECOMMENDATION_BANDS[RECOMMENDATION_BANDS.length - 1];
}

/** Ring stroke color by recommendation band. */
export function recommendationRingClass(recommendation?: Recommendation): string {
  switch (recommendation) {
    case "strong_apply":
    case "apply":
      return "stroke-emerald-500";
    case "stretch":
      return "stroke-amber-500";
    case "not_recommended":
      return "stroke-rose-400";
    default:
      return "stroke-emerald-500";
  }
}
