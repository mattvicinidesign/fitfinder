"use client";

import { Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MATCHED_VIA_PREFIX } from "@/lib/breakdown-labels";

export interface BreakdownMatchItem {
  label: string;
  resumeMatch?: string | null;
  listedInBonus?: boolean;
  subtext?: string | null;
}

export function BreakdownMatchList({
  title,
  items,
  variant,
  showBonusBadge = false,
  resumeHitPrefix = MATCHED_VIA_PREFIX,
}: {
  title: string;
  items: BreakdownMatchItem[];
  variant: "matched" | "missing";
  showBonusBadge?: boolean;
  resumeHitPrefix?: string;
}) {
  if (!items.length) return null;

  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <ul className="space-y-1">
        {items.map((item) => (
          <li
            key={item.label}
            className="flex items-start gap-2 text-[13px] leading-snug"
          >
            {variant === "matched" ? (
              <Check className="size-3.5 shrink-0 text-primary mt-0.5" />
            ) : (
              <X className="size-3.5 shrink-0 text-muted-foreground/70 mt-0.5" />
            )}
            <span className="min-w-0 flex-1">
              <span className="inline-flex flex-wrap items-center gap-1.5">
                <span
                  className={
                    variant === "matched"
                      ? "text-foreground"
                      : "text-muted-foreground"
                  }
                >
                  {item.label}
                </span>
                {showBonusBadge && item.listedInBonus ? (
                  <Badge
                    variant="outline"
                    className="h-4 px-1.5 text-[10px] font-medium border-primary/60 bg-primary/10 text-primary"
                  >
                    Bonus
                  </Badge>
                ) : null}
              </span>
              {variant === "matched" &&
              item.resumeMatch &&
              item.resumeMatch.toLowerCase().trim() !==
                item.label.toLowerCase().trim() ? (
                <span className="block text-[11px] text-muted-foreground">
                  {resumeHitPrefix} {item.resumeMatch}
                </span>
              ) : null}
              {item.subtext ? (
                <span className="block text-[11px] text-muted-foreground">
                  {item.subtext}
                </span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
