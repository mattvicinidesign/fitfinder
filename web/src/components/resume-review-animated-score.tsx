"use client";

import { clampResumeReviewScore } from "@/lib/resume-review-score-colors";
import { useAnimatedNumber } from "@/lib/use-score-reveal";
import { cn } from "@/lib/utils";

export const resumeReviewCategoryScoreClass =
  "shrink-0 text-[40px] font-bold leading-none tabular-nums tracking-tight text-foreground";

function formatScorePercent(score: number): string {
  return `${Math.max(0, Math.min(100, Math.round(score)))}%`;
}

export function ResumeReviewAnimatedScore({
  score,
  animate = false,
  animateDelay = 0,
  className,
}: {
  score: number;
  animate?: boolean;
  animateDelay?: number;
  className?: string;
}) {
  const target = clampResumeReviewScore(score);
  const animated = useAnimatedNumber(target, {
    disabled: !animate,
    duration: 900,
    delay: animateDelay,
  });

  return (
    <p className={cn(resumeReviewCategoryScoreClass, className)}>
      {formatScorePercent(animated)}
    </p>
  );
}
