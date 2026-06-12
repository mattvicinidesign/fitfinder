import type { Recommendation } from "@/lib/types";

/** Matches SummaryMatchBadge / SummaryInfoBadge pill tints (green = match, red = mismatch). */
export type ScoreShadeTier = "positive" | "caution" | "negative";

/**
 * All score tiers share the single brand accent (primary blue). Progress tracks
 * use bg-border (same as the score ring track); fill, text, and ring use primary.
 */
const PRIMARY_SHADE = {
  text: "text-primary",
  track: "bg-border",
  fill: "bg-primary",
  ring: "stroke-primary",
} as const;

const SCORE_SHADE_CLASSES: Record<
  ScoreShadeTier,
  { text: string; track: string; fill: string; ring: string }
> = {
  positive: PRIMARY_SHADE,
  caution: PRIMARY_SHADE,
  negative: PRIMARY_SHADE,
};

/** Map a 0–100 score to pill-aligned shade tier. */
export function scoreShadeTier(score: number): ScoreShadeTier {
  if (score >= 80) return "positive";
  if (score >= 40) return "caution";
  return "negative";
}

export function scoreShadeClasses(score: number) {
  return SCORE_SHADE_CLASSES[scoreShadeTier(score)];
}

/** Tailwind text color class for a 0–100 score (pill text tint). */
export function scoreColor(score: number): string {
  return scoreShadeClasses(score).text;
}

/** Fill for a 0–100 progress bar (pill border tint). */
export function scoreProgressClass(score: number): string {
  return scoreShadeClasses(score).fill;
}

/** Shared height for score progress bars (track + fill). */
export const SCORE_PROGRESS_BAR_HEIGHT_CLASS = "h-0.5";

/** Unfilled track — matches QualificationScoreCircle background ring (stroke-border). */
export const SCORE_PROGRESS_TRACK_CLASS = "bg-border";

/** Track background for a 0–100 progress bar. */
export function scoreProgressTrackClass(_score?: number): string {
  return SCORE_PROGRESS_TRACK_CLASS;
}

/** Ring stroke for recommendation band (pill-aligned). */
export function scoreRingStrokeClass(tier: ScoreShadeTier): string {
  return SCORE_SHADE_CLASSES[tier].ring;
}

/** Badge variant intent for a recommendation. */
export function recommendationTone(
  rec: Recommendation,
): "positive" | "neutral" | "warning" | "negative" {
  switch (rec) {
    case "strong_apply":
    case "apply":
      return "positive";
    case "stretch":
      return "neutral";
    case "not_recommended":
      return "negative";
  }
}

export function recommendationShadeTier(
  recommendation?: Recommendation,
): ScoreShadeTier {
  switch (recommendation) {
    case "strong_apply":
    case "apply":
      return "positive";
    case "stretch":
      return "caution";
    case "not_recommended":
      return "negative";
    default:
      return "positive";
  }
}
