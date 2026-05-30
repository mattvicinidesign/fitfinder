import type { Recommendation } from "@/lib/types";

/** Matches SummaryMatchBadge / SummaryInfoBadge pill tints. */
export type ScoreShadeTier = "positive" | "caution" | "negative";

/** Opaque tints aligned with SummaryMatchBadge (no layered alpha / gradient look). */
const SCORE_SHADE_CLASSES: Record<
  ScoreShadeTier,
  { text: string; track: string; fill: string; ring: string }
> = {
  positive: {
    text: "text-emerald-800 dark:text-emerald-300",
    track: "bg-emerald-100 dark:bg-emerald-950/60",
    fill: "bg-emerald-500 dark:bg-emerald-400",
    ring: "stroke-emerald-500 dark:stroke-emerald-400",
  },
  caution: {
    text: "text-amber-800 dark:text-amber-300",
    track: "bg-amber-100 dark:bg-amber-950/60",
    fill: "bg-amber-500 dark:bg-amber-400",
    ring: "stroke-amber-500 dark:stroke-amber-400",
  },
  negative: {
    text: "text-rose-800 dark:text-rose-300",
    track: "bg-rose-100 dark:bg-rose-950/60",
    fill: "bg-rose-500 dark:bg-rose-400",
    ring: "stroke-rose-500 dark:stroke-rose-400",
  },
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

/** Track background for a 0–100 progress bar (pill background tint). */
export function scoreProgressTrackClass(score: number): string {
  return scoreShadeClasses(score).track;
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
