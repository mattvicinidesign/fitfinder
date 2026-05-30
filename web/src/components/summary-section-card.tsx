"use client";

import { cn } from "@/lib/utils";

export function SummarySectionCard({
  title,
  children,
  aside,
  className,
}: {
  title: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
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
          <p
            id={`summary-${title.replace(/\s+/g, "-").toLowerCase()}`}
            className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground"
          >
            {title}
          </p>
          {children}
        </div>
        {aside ? <div className="shrink-0">{aside}</div> : null}
      </div>
    </section>
  );
}
