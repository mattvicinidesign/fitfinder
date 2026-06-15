"use client";

import { NOT_SPECIFIED_PILL_CLASS } from "@/lib/match-pill-styles";
import { NOT_SPECIFIED_LABEL } from "@/lib/not-specified";
import { cn } from "@/lib/utils";

/** Blue pill for fields the posting did not specify. */
export function SummaryNotSpecifiedBadge({
  label = NOT_SPECIFIED_LABEL,
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide",
        NOT_SPECIFIED_PILL_CLASS,
        className,
      )}
    >
      {label}
    </span>
  );
}
