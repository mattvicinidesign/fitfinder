"use client";

import { Progress, ProgressIndicator, ProgressTrack } from "@/components/ui/progress";
import {
  scoreColor,
  scoreProgressClass,
  scoreProgressTrackClass,
} from "@/lib/score";
import { SCORING_CATEGORY_SUBTOTAL_LABEL } from "@/lib/scoring-terminology";
import { cn } from "@/lib/utils";

/** Footer subtotal row for a scoring category card (label, %, progress bar). */
export function SectionScoreSubtotal({
  score,
  label = SCORING_CATEGORY_SUBTOTAL_LABEL,
  className,
}: {
  score: number | null;
  label?: string;
  className?: string;
}) {
  const hasScore = score != null;
  const pct = hasScore ? Math.round(score) : 0;

  return (
    <div
      className={cn(
        "pt-3 mt-3 border-t border-border/60 space-y-1.5 min-w-0",
        className,
      )}
      role="group"
      aria-label={`${label}${hasScore ? `: ${pct}%` : ""}`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-[Georgia,'Times_New_Roman',serif] text-[14px] text-foreground leading-snug">
          {label}
        </span>
        <span
          className={cn(
            "text-[14px] font-medium tabular-nums shrink-0",
            hasScore ? scoreColor(pct) : "text-muted-foreground",
          )}
        >
          {hasScore ? `${pct}%` : "—"}
        </span>
      </div>
      <Progress value={hasScore ? pct : 0} className="w-full gap-0">
        <ProgressTrack
          className={cn(
            "h-0.5",
            hasScore ? scoreProgressTrackClass(pct) : "bg-muted/50",
          )}
        >
          <ProgressIndicator
            className={hasScore ? scoreProgressClass(pct) : "bg-muted-foreground/30"}
          />
        </ProgressTrack>
      </Progress>
    </div>
  );
}
