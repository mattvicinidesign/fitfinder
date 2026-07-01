"use client";

import {
  metricScoreClass,
  type MetricScoreSize,
} from "@/components/ui/metric-score";
import { formatScoreOnTen } from "@/lib/use-score-reveal";
import { cn } from "@/lib/utils";

const DENOMINATOR_CLASS =
  "text-[0.52em] font-semibold leading-none tracking-normal text-muted-foreground";

export function FitScoreRatio({
  valueOnTen,
  size = "md",
  className,
  denominatorClassName,
  as: Component = "span",
}: {
  valueOnTen: number;
  size?: MetricScoreSize;
  /** Applied to the numerator (e.g. score band color). */
  className?: string;
  denominatorClassName?: string;
  as?: "span" | "p";
}) {
  const numerator = formatScoreOnTen(valueOnTen);

  return (
    <Component
      className={cn(metricScoreClass(size), "inline-flex items-baseline")}
    >
      <span className={className}>{numerator}</span>
      <span className={cn(DENOMINATOR_CLASS, denominatorClassName)}>/10</span>
    </Component>
  );
}
