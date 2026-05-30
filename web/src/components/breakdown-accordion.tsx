"use client";

import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export const breakdownAccordionPanelClass = cn(
  "mt-2 rounded-lg border border-border/80 bg-muted/30",
  "max-h-[min(300px,50vh)] overflow-y-auto overscroll-contain",
  "p-3.5 space-y-3",
);

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
    <div className={cn("py-3 border-b border-border/80", className)}>
      <button
        type="button"
        className="w-full text-left rounded-lg -mx-1 px-1 py-0.5 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 transition-colors"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <div className="space-y-2">{summary}</div>
        <span className="mt-1.5 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
          <ChevronDown
            className={cn(
              "size-3.5 shrink-0 transition-transform duration-200",
              open && "rotate-180",
            )}
            aria-hidden
          />
          <span>{toggleLabel}</span>
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
