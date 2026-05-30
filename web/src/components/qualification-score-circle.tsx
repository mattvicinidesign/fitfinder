"use client";

import { recommendationRingClass } from "@/lib/recommendation-bands";
import type { Recommendation } from "@/lib/types";
import { cn } from "@/lib/utils";

const RING_SIZE = 128;
const STROKE_WIDTH = 8;

/** Display fit score on a 0–10 scale (e.g. 73 → 7.3). */
export function fitScoreOnTen(fitScore: number): string {
  return fitScoreValueOnTen(fitScore).toFixed(1);
}

/** Fit score as 0–10 for ring progress. */
export function fitScoreValueOnTen(fitScore: number): number {
  return Math.max(0, Math.min(10, fitScore / 10));
}

export function QualificationScoreCircle({
  fitScore,
  recommendationLabel,
  recommendation,
  className,
}: {
  fitScore: number;
  recommendationLabel: string;
  recommendation?: Recommendation;
  className?: string;
}) {
  const scoreOnTen = fitScoreValueOnTen(fitScore);
  const display = scoreOnTen.toFixed(1);
  const progress = scoreOnTen / 10;
  const ringClass = recommendationRingClass(recommendation);

  const radius = (RING_SIZE - STROKE_WIDTH) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);
  const center = RING_SIZE / 2;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center shrink-0 text-center",
        className,
      )}
    >
      <div
        className="relative"
        style={{ width: RING_SIZE, height: RING_SIZE }}
        aria-label={`Fit score ${display} out of 10`}
        role="img"
      >
        <svg
          width={RING_SIZE}
          height={RING_SIZE}
          viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
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
        <span className="absolute inset-0 flex items-center justify-center font-[Georgia,'Times_New_Roman',serif] text-[36px] font-semibold leading-none tabular-nums tracking-tight text-foreground">
          {display}
        </span>
      </div>
      {recommendationLabel ? (
        <p className="mt-3 max-w-[11rem] font-[Georgia,'Times_New_Roman',serif] text-[10px] font-normal uppercase leading-tight tracking-[0.1em] text-muted-foreground">
          {recommendationLabel}
        </p>
      ) : null}
    </div>
  );
}
