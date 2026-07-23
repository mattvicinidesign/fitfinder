/**
 * Global score recommendation bands — keep in sync with
 * supabase/functions/_shared/opportunity_engine_constants.ts OPPORTUNITY_RECOMMENDATION_BANDS
 *
 * Display scale 0–10 = fitScore ÷ 10 (stored fitScore 0–100).
 */

import {
  recommendationShadeTier,
  scoreRingStrokeClass,
} from "@/lib/score";
import type { Recommendation } from "@/lib/types";

export const RECOMMENDATION_BANDS: {
  min: number;
  recommendation: Recommendation;
  label: string;
}[] = [
  { min: 85, recommendation: "strong_apply", label: "Pursue" },
  { min: 70, recommendation: "apply", label: "Consider" },
  { min: 50, recommendation: "stretch", label: "Review" },
  { min: 0, recommendation: "not_recommended", label: "Skip" },
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

/** Ring stroke color by recommendation band (pill-aligned tints). */
export function recommendationRingClass(recommendation?: Recommendation): string {
  return scoreRingStrokeClass(recommendationShadeTier(recommendation));
}

/** Subtext color for Pursue / Consider / Review / Skip under the score ring. */
export function recommendationLabelClass(
  recommendation?: Recommendation,
): string {
  switch (recommendation) {
    case "strong_apply":
    case "apply":
      return "text-emerald-400";
    case "stretch":
      return "text-amber-400";
    case "not_recommended":
      return "text-rose-400";
    default:
      return "text-muted-foreground";
  }
}
