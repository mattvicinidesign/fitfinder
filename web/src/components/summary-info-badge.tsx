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
        "inline-flex max-w-full items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium break-words whitespace-normal text-left leading-snug",
        positive &&
          "border-primary/45 bg-primary/15 text-primary font-semibold",
        !positive &&
          muted &&
          "border-border/60 bg-muted/40 text-muted-foreground",
        !positive &&
          !muted &&
          "border-border/80 bg-background/90 text-foreground",
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
