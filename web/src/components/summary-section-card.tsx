"use client";

import { InfoTooltip } from "@/components/info-tooltip";
import { cn } from "@/lib/utils";

export function SummarySectionCard({
  title,
  children,
  aside,
  info,
  headerEnd,
  className,
}: {
  title: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
  /** Optional explanatory text shown via an "i" tooltip next to the title. */
  info?: string;
  /** Optional control aligned to the upper-right of the header row (e.g. badge). */
  headerEnd?: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border border-border/80 bg-muted/35 px-3.5 py-3.5",
        className,
      )}
      aria-labelledby={`summary-${title.replace(/\s+/g, "-").toLowerCase()}`}
    >
      <div className="flex gap-4 items-start">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5">
              <p
                id={`summary-${title.replace(/\s+/g, "-").toLowerCase()}`}
                className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground"
              >
                {title}
              </p>
              {info ? <InfoTooltip label={`About ${title}`} text={info} /> : null}
            </div>
            {headerEnd ? (
              <div className="shrink-0 max-w-[55%]">{headerEnd}</div>
            ) : null}
          </div>
          {children}
        </div>
        {aside ? <div className="shrink-0">{aside}</div> : null}
      </div>
    </section>
  );
}
