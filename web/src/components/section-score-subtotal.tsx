"use client";

import {
  scoreColor,
} from "@/lib/score";
import {
  SCORING_CATEGORY_SUBTOTAL_LABEL,
} from "@/lib/scoring-terminology";
import {
  formatScoreOnTen,
  useAnimatedNumber,
} from "@/lib/use-score-reveal";
import { cn } from "@/lib/utils";

/** Footer subtotal row for a scoring category card (label and 0–10 score). */
export function SectionScoreSubtotal({
  score,
  label = SCORING_CATEGORY_SUBTOTAL_LABEL,
  fraction = null,
  animateDelay = 0,
  className,
}: {
  score: number | null;
  label?: string;
  /** Fallback when score is null — matched/total converted to 0–10. */
  fraction?: { matched: number; total: number } | null;
  animateDelay?: number;
  className?: string;
}) {
  const hasScore = score != null;
  const scoreOnTen = hasScore ? score / 10 : null;
  const fractionOnTen =
    fraction && fraction.total > 0
      ? (fraction.matched / fraction.total) * 10
      : null;
  const targetOnTen = scoreOnTen ?? fractionOnTen;
  const disabled = targetOnTen == null;
  const colorPct = hasScore
    ? Math.round(score)
    : fractionOnTen != null
      ? Math.round(fractionOnTen * 10)
      : 0;
  const animatedValue = useAnimatedNumber(targetOnTen ?? 0, {
    disabled,
    delay: animateDelay,
  });
  const valueText = disabled ? "—" : formatScoreOnTen(animatedValue);
  const finalValueText = disabled ? "—" : formatScoreOnTen(targetOnTen);

  return (
    <div
      className={cn(
        "-mx-3.5 -mb-3.5 mt-3 min-w-0 rounded-b-xl border-t border-border/60 bg-muted/55 px-3.5 pt-3 pb-3.5",
        className,
      )}
      role="group"
      aria-label={`${label}${!disabled ? `: ${finalValueText}` : ""}`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[14px] font-medium text-foreground leading-snug">
          {label}
        </span>
        <span
          className={cn(
            "text-[14px] font-medium tabular-nums shrink-0",
            !disabled ? scoreColor(colorPct) : "text-muted-foreground",
          )}
        >
          {valueText}
        </span>
      </div>
    </div>
  );
}
