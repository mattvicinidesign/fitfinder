"use client";

import { Sparkles } from "lucide-react";
import { useId, type ReactNode } from "react";
import {
  RESUME_REVIEW_AI_BUTTON_BORDER_GRADIENT,
  RESUME_REVIEW_AI_BUTTON_TEXT_GRADIENT,
} from "@/lib/resume-review-score-colors";
import { SCREEN_PRIMARY_CTA_CLASS, SCREEN_REGULAR_CTA_CLASS } from "@/components/resume-upload-styles";
import { cn } from "@/lib/utils";

export function AiGradientPillBadge({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "ai-gradient-pill-shimmer relative shrink-0 rounded-full p-px",
        className,
      )}
      style={{ background: RESUME_REVIEW_AI_BUTTON_BORDER_GRADIENT }}
    >
      <div className="relative z-[1] flex h-7 items-center justify-center rounded-full bg-background px-2.5 text-[11px] font-semibold whitespace-nowrap">
        <span
          className="bg-clip-text text-transparent"
          style={{ backgroundImage: RESUME_REVIEW_AI_BUTTON_TEXT_GRADIENT }}
        >
          {children}
        </span>
      </div>
    </div>
  );
}

export function AiGradientPillButton({
  children,
  onClick,
  badge,
  compact = false,
  size = "default",
  showIcon = true,
  className,
}: {
  children: ReactNode;
  onClick: () => void;
  badge?: string;
  compact?: boolean;
  size?: "default" | "large";
  showIcon?: boolean;
  className?: string;
}) {
  const iconGradientId = useId().replace(/:/g, "");

  return (
    <div
      className={cn(
        "ai-gradient-pill-shimmer relative rounded-full p-px",
        compact ? "w-auto shrink-0" : "w-full",
        className,
      )}
      style={{ background: RESUME_REVIEW_AI_BUTTON_BORDER_GRADIENT }}
    >
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "relative z-[1] flex items-center justify-center rounded-full bg-background font-semibold transition-opacity hover:opacity-90 active:opacity-80",
          compact
            ? cn("h-7 gap-1 px-2.5 text-[11px]", !showIcon && "px-2.5")
            : size === "large"
              ? cn(
                  SCREEN_PRIMARY_CTA_CLASS,
                  "gap-2 px-4 shadow-[0_8px_28px_rgba(0,0,0,0.45)]",
                )
              : cn(SCREEN_REGULAR_CTA_CLASS, "gap-2 px-4"),
        )}
      >
        {showIcon ? (
          <Sparkles
            className={cn("shrink-0", compact ? "size-3" : "size-4")}
            strokeWidth={2}
            aria-hidden
            style={{ stroke: `url(#${iconGradientId})` }}
          />
        ) : null}
        <span
          className="bg-clip-text text-transparent"
          style={{ backgroundImage: RESUME_REVIEW_AI_BUTTON_TEXT_GRADIENT }}
        >
          {children}
        </span>
        {badge ? (
          <span
            className={cn(
              "rounded-full border border-border/60 bg-card font-semibold uppercase tracking-wider text-muted-foreground",
              compact
                ? "px-1 py-px text-[8px]"
                : "px-1.5 py-0.5 text-[9px]",
            )}
          >
            {badge}
          </span>
        ) : null}
        <svg width="0" height="0" className="absolute" aria-hidden>
          <defs>
            <linearGradient
              id={iconGradientId}
              x1="0%"
              y1="100%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor="#e879f9" />
              <stop offset="50%" stopColor="#d946ef" />
              <stop offset="100%" stopColor="#c026d3" />
            </linearGradient>
          </defs>
        </svg>
      </button>
    </div>
  );
}
