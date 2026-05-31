"use client";

import { Progress, ProgressIndicator, ProgressTrack } from "@/components/ui/progress";
import {
  SCORE_BAR_REVEAL_CLASS,
  useRevealOnMount,
} from "@/lib/use-score-reveal";
import { cn } from "@/lib/utils";

export function AnimatedScoreProgress({
  value,
  delay = 0,
  trackClassName,
  indicatorClassName,
  className,
}: {
  value: number;
  delay?: number;
  trackClassName?: string;
  indicatorClassName?: string;
  className?: string;
}) {
  const revealed = useRevealOnMount(delay);
  const displayValue = revealed ? value : 0;

  return (
    <Progress value={displayValue} className={cn("w-full gap-0", className)}>
      <ProgressTrack className={trackClassName}>
        <ProgressIndicator
          className={cn(SCORE_BAR_REVEAL_CLASS, indicatorClassName)}
        />
      </ProgressTrack>
    </Progress>
  );
}
