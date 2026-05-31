"use client";

import type { SummaryMatchState } from "@/lib/summary-criteria";
import { cn } from "@/lib/utils";

export function SummaryMatchBadge({
  label,
  state,
  className,
}: {
  label: string;
  state: SummaryMatchState;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide",
        state === "match" &&
          "border-emerald-500/45 bg-emerald-500/15 text-emerald-800 dark:text-emerald-300",
        state === "same_country" &&
          "border-amber-500/45 bg-amber-500/15 text-amber-800 dark:text-amber-300",
        state === "mismatch" &&
          "border-rose-500/45 bg-rose-500/15 text-rose-800 dark:text-rose-300",
        state === "unknown" &&
          "border-border bg-muted text-foreground font-medium",
        className,
      )}
    >
      {label}
    </span>
  );
}
