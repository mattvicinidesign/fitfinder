"use client";

import {
  metricScoreClass,
  type MetricScoreSize,
} from "@/components/ui/metric-score";
import { formatScoreOnTen } from "@/lib/use-score-reveal";
import { cn } from "@/lib/utils";

/** Master ring: smaller muted /10. */
const DENOMINATOR_SCALED_CLASS =
  "text-[0.52em] font-semibold leading-none tracking-normal text-muted-foreground";

/** Inline category ratios: same size as the numerator. */
const DENOMINATOR_EQUAL_CLASS =
  "font-semibold leading-none tracking-normal text-muted-foreground";

export function FitScoreRatio({
  valueOnTen,
  size = "md",
  className,
  denominatorClassName,
  equalParts = false,
  as: Component = "span",
}: {
  valueOnTen: number;
  size?: MetricScoreSize;
  /** Applied to the numerator (e.g. score band color). */
  className?: string;
  denominatorClassName?: string;
  /**
   * When true, numerator, division sign, and denominator share one text size
   * (category / rollup ratios). Master ring keeps a scaled /10 by default.
   */
  equalParts?: boolean;
  as?: "span" | "p";
}) {
  const numerator = formatScoreOnTen(valueOnTen);

  return (
    <Component
      className={cn(metricScoreClass(size), "inline-flex items-baseline")}
    >
      <span className={cn("text-primary", className)}>{numerator}</span>
      <span
        className={cn(
          equalParts ? DENOMINATOR_EQUAL_CLASS : DENOMINATOR_SCALED_CLASS,
          denominatorClassName,
        )}
      >
        /10
      </span>
    </Component>
  );
}
