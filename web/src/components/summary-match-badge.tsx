"use client";

import type { SummaryMatchState } from "@/lib/summary-criteria";
import {
  MATCH_PILL_CLASS,
  MISMATCH_PILL_CLASS,
  NOT_SPECIFIED_PILL_CLASS,
} from "@/lib/match-pill-styles";
import { isNotSpecifiedDisplay } from "@/lib/not-specified";
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
        state === "match" && MATCH_PILL_CLASS,
        state === "same_country" && MATCH_PILL_CLASS,
        state === "mismatch" && MISMATCH_PILL_CLASS,
        state === "unknown" &&
          (isNotSpecifiedDisplay(label)
            ? NOT_SPECIFIED_PILL_CLASS
            : "bg-muted/60 text-muted-foreground font-medium"),
        className,
      )}
    >
      {label}
    </span>
  );
}
