import { cn } from "@/lib/utils";

/** Premium KPI numeral styling — IBM Plex Sans, tight tracking, lining tabular figures. */
const METRIC_NUMERAL_BASE = cn(
  "font-metric font-semibold tabular-nums lining-nums",
  "[font-feature-settings:'tnum'_'lnum']",
);

export const metricScoreSizes = {
  /** Home hero average fit (primary KPI). */
  hero: "text-[64px] leading-[0.92] tracking-[-0.045em]",
  /** Report ring — large. */
  xl: "text-[42px] leading-none tracking-[-0.04em]",
  /** Report ring — default. */
  lg: "text-[36px] leading-none tracking-[-0.038em]",
  /** Activity list fit column. */
  md: "text-[28px] leading-none tracking-[-0.035em]",
  /** Category detail cards / Overall Match rollup ratios. */
  sm: "text-[15px] leading-none tracking-[-0.02em]",
  /** Secondary category ratios (slightly smaller than sm). */
  xs: "text-[13px] leading-none tracking-[-0.02em]",
} as const;

export type MetricScoreSize = keyof typeof metricScoreSizes;

export function metricScoreClass(
  size: MetricScoreSize,
  className?: string,
): string {
  return cn(METRIC_NUMERAL_BASE, metricScoreSizes[size], className);
}

export function MetricScore({
  children,
  size,
  className,
  as: Component = "span",
}: {
  children: React.ReactNode;
  size: MetricScoreSize;
  className?: string;
  as?: "span" | "p";
}) {
  return (
    <Component className={metricScoreClass(size, className)}>{children}</Component>
  );
}
