/** Shared resume review score palette — matches the master gauge arc. */
export const RESUME_REVIEW_SCORE_GRADIENT_VERTICAL =
  "linear-gradient(to top, #f43f5e 0%, #f97316 28%, #eab308 52%, #84cc16 76%, #22c55e 100%)";

export const RESUME_REVIEW_SCORE_GRADIENT_HORIZONTAL =
  "linear-gradient(to right, #f43f5e 0%, #f97316 28%, #eab308 52%, #84cc16 76%, #22c55e 100%)";

/** AI pill button — gradient border (magenta → cyan). */
export const RESUME_REVIEW_AI_BUTTON_BORDER_GRADIENT =
  "linear-gradient(90deg, #d946ef 0%, #a855f7 28%, #38bdf8 72%, #22d3ee 100%)";

/** AI pill button — gradient label text (cyan → pink). */
export const RESUME_REVIEW_AI_BUTTON_TEXT_GRADIENT =
  "linear-gradient(90deg, #38bdf8 0%, #22d3ee 38%, #f472b6 100%)";

export function clampResumeReviewScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function resumeReviewScoreTextClass(score: number): string {
  const clamped = clampResumeReviewScore(score);
  if (clamped >= 75) return "text-emerald-400";
  if (clamped >= 50) return "text-amber-400";
  if (clamped >= 25) return "text-orange-400";
  return "text-rose-400";
}

export function resumeReviewScoreIndicatorColor(score: number): string {
  const clamped = clampResumeReviewScore(score);
  if (clamped >= 75) return "#22c55e";
  if (clamped >= 50) return "#eab308";
  if (clamped >= 25) return "#f97316";
  return "#f43f5e";
}
