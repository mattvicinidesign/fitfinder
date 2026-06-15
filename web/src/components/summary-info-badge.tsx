"use client";

import {
  MATCH_PILL_CLASS,
  MISMATCH_PILL_CLASS,
  MUTED_PILL_CLASS,
  NEUTRAL_PILL_CLASS,
  PARTIAL_MATCH_PILL_CLASS,
} from "@/lib/match-pill-styles";
import { cn } from "@/lib/utils";

/** Neutral pill for non-scored posting facts. */
export function SummaryInfoBadge({
  label,
  icon,
  muted,
  positive,
  negative,
  partial,
  className,
}: {
  label: string;
  /** Shown before label (e.g. country flag for US hire area). */
  icon?: string;
  muted?: boolean;
  /** Green highlight when the value matches the candidate profile/resume. */
  positive?: boolean;
  /** Red highlight when the value is identified but does not match. */
  negative?: boolean;
  /** Blue highlight for a partial onboarding preference match. */
  partial?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium break-words whitespace-normal text-left leading-snug",
        positive && MATCH_PILL_CLASS,
        !positive && partial && PARTIAL_MATCH_PILL_CLASS,
        !positive && !partial && negative && MISMATCH_PILL_CLASS,
        !positive && !negative && !partial && muted && MUTED_PILL_CLASS,
        !positive && !negative && !partial && !muted && NEUTRAL_PILL_CLASS,
        className,
      )}
      title={label}
    >
      {icon ? (
        <span className="text-[10px] leading-none shrink-0" aria-hidden>
          {icon}
        </span>
      ) : null}
      {label}
    </span>
  );
}
