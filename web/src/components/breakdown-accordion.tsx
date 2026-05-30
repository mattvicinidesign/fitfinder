"use client";

import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/** Bordered container for each category row in Category matching. */
export const breakdownCategoryCardClass = cn(
  "rounded-lg border border-border/80 p-3",
  "transition-colors hover:bg-muted/40",
);

export const breakdownAccordionPanelClass = cn("mt-2 space-y-3");

export function BreakdownAccordion({
  summary,
  children,
  ariaLabel,
  expandHint = "details",
  defaultOpen = false,
  className,
}: {
  summary: React.ReactNode;
  children: React.ReactNode;
  ariaLabel: string;
  /** Shown as “Show {expandHint}” / “Hide {expandHint}”. */
  expandHint?: string;
  defaultOpen?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();
  const toggleLabel = open ? `Hide ${expandHint}` : `Show ${expandHint}`;

  return (
    <div className={cn(breakdownCategoryCardClass, className)}>
      <button
        type="button"
        className="w-full text-left rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <div className="space-y-2">{summary}</div>
        <span className="mt-1.5 flex w-full items-center justify-between gap-2 text-[11px] font-medium text-muted-foreground">
          <span>{toggleLabel}</span>
          <ChevronDown
            className={cn(
              "size-3.5 shrink-0 transition-transform duration-200",
              open && "rotate-180",
            )}
            aria-hidden
          />
        </span>
      </button>

      {open ? (
        <div
          id={panelId}
          role="region"
          aria-label={ariaLabel}
          className={breakdownAccordionPanelClass}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
