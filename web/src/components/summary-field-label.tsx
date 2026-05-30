"use client";

import { cn } from "@/lib/utils";

/** Serif sub-labels for summary cards (Role, Client rating, Industry, etc.). */
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
        "font-[Georgia,'Times_New_Roman',serif] text-[15px] font-normal leading-snug text-foreground",
        className,
      )}
    >
      {children}
    </p>
  );
}
