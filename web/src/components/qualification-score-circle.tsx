"use client";

import { recommendationLabelClass, recommendationRingClass } from "@/lib/recommendation-bands";
import { globalScoreAriaLabel } from "@/lib/scoring-terminology";
import {
  SCORE_RING_REVEAL_CLASS,
  formatFitScoreRatioOnTen,
  useAnimatedNumber,
  useRevealOnMount,
} from "@/lib/use-score-reveal";
import type { Recommendation } from "@/lib/types";
import { FitScoreRatio } from "@/components/fit-score-ratio";
import { cn } from "@/lib/utils";

export const QUALIFICATION_SCORE_RING_SIZES = {
  default: 128,
  large: 152,
} as const;

const RING_SIZES = QUALIFICATION_SCORE_RING_SIZES;

const STROKE_WIDTH = 8;

/** Global fit score as a 0–10 ratio (e.g. 73 → 7.3/10, 100 → 10/10). */
export function fitScoreOnTen(fitScore: number): string {
  return formatFitScoreRatioOnTen(fitScoreValueOnTen(fitScore));
}

/** Global score as 0–10 for ring progress. */
export function fitScoreValueOnTen(fitScore: number): number {
  return Math.max(0, Math.min(10, fitScore / 10));
}

export function QualificationScoreCircle({
  fitScore,
  recommendationLabel,
  recommendation,
  size = "default",
  animate = true,
  className,
}: {
  fitScore: number;
  recommendationLabel: string;
  recommendation?: Recommendation;
  size?: keyof typeof RING_SIZES;
  animate?: boolean;
  className?: string;
}) {
  const ringSize = RING_SIZES[size];
  const scoreOnTen = fitScoreValueOnTen(fitScore);
  const revealed = useRevealOnMount(0, !animate);
  const animatedScore = useAnimatedNumber(scoreOnTen, {
    disabled: !animate,
  });
  const display = formatFitScoreRatioOnTen(animatedScore);
  const progress = scoreOnTen / 10;
  const animatedProgress = revealed ? progress : 0;
  const ringClass = recommendationRingClass(recommendation);

  const radius = (ringSize - STROKE_WIDTH) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - animatedProgress);
  const center = ringSize / 2;
  const ratioSize = size === "large" ? "xl" : "lg";

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center shrink-0 text-center",
        className,
      )}
    >
      <div
        className="relative"
        style={{ width: ringSize, height: ringSize }}
        aria-label={globalScoreAriaLabel(display, recommendationLabel)}
        role="img"
      >
        <svg
          width={ringSize}
          height={ringSize}
          viewBox={`0 0 ${ringSize} ${ringSize}`}
          className="block -rotate-90"
          aria-hidden
        >
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            className="stroke-border"
            strokeWidth={STROKE_WIDTH}
          />
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            className={cn(
              ringClass,
              animate ? SCORE_RING_REVEAL_CLASS : undefined,
            )}
            strokeWidth={STROKE_WIDTH}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center px-3 text-foreground">
          <span className="relative flex -translate-y-1.5 flex-col items-center">
            <FitScoreRatio
              valueOnTen={animatedScore}
              size={ratioSize}
              className={recommendationLabelClass(recommendation)}
            />
            {recommendationLabel ? (
              <span
                className={cn(
                  "absolute top-full mt-2.5 max-w-[5.5rem] truncate text-center text-[10px] font-medium leading-tight tracking-wide",
                  recommendationLabelClass(recommendation),
                )}
              >
                {recommendationLabel}
              </span>
            ) : null}
          </span>
        </span>
      </div>
    </div>
  );
}
