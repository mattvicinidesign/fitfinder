"use client";

import { recommendationRingClass } from "@/lib/recommendation-bands";
import { globalScoreAriaLabel } from "@/lib/scoring-terminology";
import type { Recommendation } from "@/lib/types";
import { cn } from "@/lib/utils";

const RING_SIZES = {
  default: 128,
  large: 152,
} as const;

const STROKE_WIDTH = 8;

/** Global score on a 0–10 scale (e.g. 73 → 7.3). */
export function fitScoreOnTen(fitScore: number): string {
  return fitScoreValueOnTen(fitScore).toFixed(1);
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
  className,
}: {
  fitScore: number;
  recommendationLabel: string;
  recommendation?: Recommendation;
  size?: keyof typeof RING_SIZES;
  className?: string;
}) {
  const ringSize = RING_SIZES[size];
  const scoreOnTen = fitScoreValueOnTen(fitScore);
  const display = scoreOnTen.toFixed(1);
  const progress = scoreOnTen / 10;
  const ringClass = recommendationRingClass(recommendation);

  const radius = (ringSize - STROKE_WIDTH) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);
  const center = ringSize / 2;
  const scoreFont = size === "large" ? "text-[42px]" : "text-[36px]";

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
              "transition-[stroke-dashoffset] duration-500 ease-out",
            )}
            strokeWidth={STROKE_WIDTH}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
          />
        </svg>
        <span
          className={cn(
            "absolute inset-0 flex items-center justify-center font-[Georgia,'Times_New_Roman',serif] font-semibold leading-none tabular-nums tracking-tight text-foreground",
            scoreFont,
          )}
        >
          {display}
        </span>
      </div>
      {recommendationLabel ? (
        <p className="mt-3 max-w-[12rem] text-center font-[Georgia,'Times_New_Roman',serif] text-[10px] font-normal leading-tight tracking-wide text-muted-foreground">
          {recommendationLabel}
        </p>
      ) : null}
    </div>
  );
}
