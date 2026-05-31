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
          "border-primary/45 bg-primary/15 text-primary",
        state === "same_country" &&
          "border-primary/45 bg-primary/15 text-primary",
        state === "mismatch" &&
          "border-border bg-muted text-foreground font-medium",
        state === "unknown" &&
          "border-border bg-muted text-foreground font-medium",
        className,
      )}
    >
      {label}
    </span>
  );
}
