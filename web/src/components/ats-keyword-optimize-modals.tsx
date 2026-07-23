"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { getAppOverlayRoot } from "@/lib/overlay-portal";
import { APP_PORTAL_OVERLAY_Z } from "@/lib/overlay-z-index";
import { cn } from "@/lib/utils";

const ATS_OPTIMIZE_MODAL_SHELL = cn(
  "absolute inset-0 flex items-center justify-center bg-black/55 px-4 py-4",
  APP_PORTAL_OVERLAY_Z,
);

const ATS_OPTIMIZE_MODAL_CARD =
  "w-full max-w-md rounded-2xl border border-border/70 bg-card p-5 shadow-xl";

const ATS_OPTIMIZE_STEPS = [
  "Analyzing Resume",
  "Identifying Weak Keywords",
  "Applying ATS Enhancements",
  "Preparing Preview",
] as const;

export function AtsKeywordOptimizeLoadingOverlay({
  open,
  stepIndex,
}: {
  open: boolean;
  stepIndex: number;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!open || !mounted) return null;

  const currentStep =
    ATS_OPTIMIZE_STEPS[stepIndex] ?? ATS_OPTIMIZE_STEPS[ATS_OPTIMIZE_STEPS.length - 1];

  return createPortal(
    <div
      className={ATS_OPTIMIZE_MODAL_SHELL}
      role="status"
      aria-live="polite"
      aria-label="Optimizing resume keywords"
    >
      <div className={ATS_OPTIMIZE_MODAL_CARD}>
        <div className="flex flex-col items-center text-center">
          <div className="relative size-12">
            <div className="absolute inset-0 animate-spin rounded-full border-[3px] border-primary/20 border-t-primary" />
          </div>
          <p className="mt-4 text-[18px] font-semibold text-foreground">
            {currentStep}
          </p>
        </div>

        <div className="mt-4 flex flex-col gap-2">
          {ATS_OPTIMIZE_STEPS.map((step, index) => (
            <div
              key={step}
              className={cn(
                "flex items-center gap-2 text-[14px]",
                index <= stepIndex
                  ? "text-foreground"
                  : "text-muted-foreground/60",
              )}
            >
              <span
                className={cn(
                  "size-2 shrink-0 rounded-full",
                  index < stepIndex
                    ? "bg-emerald-400"
                    : index === stepIndex
                      ? "animate-pulse bg-primary"
                      : "bg-muted",
                )}
              />
              {step}
            </div>
          ))}
        </div>
      </div>
    </div>,
    getAppOverlayRoot(),
  );
}
