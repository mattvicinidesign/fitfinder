"use client";

import { cn } from "@/lib/utils";

/** Serif label for a scoring item (Timezone, Role, Industry, etc.). */
export function SummaryFieldLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "text-[15px] font-medium leading-snug text-foreground",
        className,
      )}
    >
      {children}
    </p>
  );
}
