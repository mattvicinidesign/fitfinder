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
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide",
        state === "match" && "bg-primary/25 text-primary",
        state === "same_country" && "bg-primary/25 text-primary",
        state === "mismatch" && "bg-muted text-foreground font-medium",
        state === "unknown" && "bg-muted text-foreground font-medium",
        className,
      )}
    >
      {label}
    </span>
  );
}
