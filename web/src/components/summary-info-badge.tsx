"use client";

import { cn } from "@/lib/utils";

/** Neutral pill for non-scored posting facts. */
export function SummaryInfoBadge({
  label,
  icon,
  muted,
  positive,
  className,
}: {
  label: string;
  /** Shown before label (e.g. country flag for US hire area). */
  icon?: string;
  muted?: boolean;
  /** Green highlight (e.g. US client origin). */
  positive?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium break-words whitespace-normal text-left leading-snug",
        positive && "bg-primary/25 text-primary font-semibold",
        !positive && muted && "bg-muted/60 text-muted-foreground",
        !positive && !muted && "bg-muted text-foreground",
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
