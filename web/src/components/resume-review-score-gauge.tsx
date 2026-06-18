"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  clampResumeReviewScore,
  resumeReviewScoreIndicatorColor,
  resumeReviewScoreTextClass,
} from "@/lib/resume-review-score-colors";

const WIDTH = 260;
const HEIGHT = 150;
const CX = 130;
const CY = 128;
const RADIUS = 96;
const STROKE = 14;
const ANIMATION_MS = 1200;

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  endDeg: number,
) {
  const start = polar(cx, cy, r, startDeg);
  const end = polar(cx, cy, r, endDeg);
  const sweep = endDeg - startDeg;
  const largeArc = sweep > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

function scoreToAngle(score: number) {
  const t = clampResumeReviewScore(score) / 100;
  return 180 + t * 180;
}

function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3;
}

function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function ResumeReviewScoreGauge({
  score,
  animate = false,
  onAnimationComplete,
  className,
}: {
  score: number;
  animate?: boolean;
  onAnimationComplete?: () => void;
  className?: string;
}) {
  const targetScore = clampResumeReviewScore(score);
  const [displayScore, setDisplayScore] = useState(() =>
    animate ? 0 : targetScore,
  );
  const displayScoreRef = useRef(displayScore);
  const onCompleteRef = useRef(onAnimationComplete);
  displayScoreRef.current = displayScore;
  onCompleteRef.current = onAnimationComplete;

  useEffect(() => {
    let cancelled = false;
    let rafId = 0;

    const toScore = targetScore;
    const fromScore = animate ? 0 : displayScoreRef.current;

    if (!animate && Math.abs(fromScore - toScore) < 0.5) {
      setDisplayScore(toScore);
      return;
    }

    if (prefersReducedMotion() || fromScore === toScore) {
      setDisplayScore(toScore);
      if (animate) onCompleteRef.current?.();
      return;
    }

    let start: number | null = null;

    const step = (timestamp: number) => {
      if (cancelled) return;
      if (start === null) start = timestamp;
      const progress = Math.min(1, (timestamp - start) / ANIMATION_MS);
      setDisplayScore(fromScore + (toScore - fromScore) * easeOutCubic(progress));

      if (progress < 1) {
        rafId = requestAnimationFrame(step);
      } else {
        setDisplayScore(toScore);
        onCompleteRef.current?.();
      }
    };

    setDisplayScore(fromScore);
    rafId = requestAnimationFrame(step);

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
  }, [animate, targetScore]);

  const clamped = clampResumeReviewScore(displayScore);
  const indicatorAngle = scoreToAngle(displayScore);
  const indicator = polar(CX, CY, RADIUS, indicatorAngle);
  const label = `${Math.round(displayScore)}%`;

  return (
    <div
      className={cn("relative mx-auto w-full max-w-[280px]", className)}
      role="img"
      aria-label={`Resume health score ${targetScore}%`}
    >
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full"
        aria-hidden
      >
        <defs>
          <linearGradient id="resume-review-gauge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f43f5e" />
            <stop offset="28%" stopColor="#f97316" />
            <stop offset="52%" stopColor="#eab308" />
            <stop offset="76%" stopColor="#84cc16" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
        </defs>

        <path
          d={arcPath(CX, CY, RADIUS, 180, 360)}
          fill="none"
          stroke="currentColor"
          strokeWidth={STROKE}
          strokeLinecap="round"
          className="text-muted/80"
        />

        <path
          d={arcPath(CX, CY, RADIUS, 180, 360)}
          fill="none"
          stroke="url(#resume-review-gauge-gradient)"
          strokeWidth={STROKE}
          strokeLinecap="round"
        />

        {clamped < 100 ? (
          <path
            d={arcPath(CX, CY, RADIUS, indicatorAngle, 360)}
            fill="none"
            stroke="currentColor"
            strokeWidth={STROKE + 2}
            strokeLinecap="round"
            className="text-background/90"
          />
        ) : null}

        <circle
          cx={indicator.x}
          cy={indicator.y}
          r={9}
          fill="#ffffff"
          stroke={resumeReviewScoreIndicatorColor(clamped)}
          strokeWidth={3}
        />
      </svg>

      <p
        className={cn(
          "absolute inset-x-0 bottom-0 text-center text-[56px] font-bold leading-none tabular-nums tracking-tight",
          resumeReviewScoreTextClass(clamped),
        )}
      >
        {label}
      </p>
    </div>
  );
}
