"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { getAppOverlayRoot } from "@/lib/overlay-portal";
import { ATS_OPTIMIZE_CONFIRM_EXAMPLES } from "@/lib/resume-review-ats-optimization";
import { cn } from "@/lib/utils";

export function AtsKeywordOptimizeConfirmModal({
  open,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="absolute inset-0 z-50 flex items-end justify-center bg-black/55 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ats-optimize-title"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border/70 bg-card p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2
          id="ats-optimize-title"
          className="text-[20px] font-bold leading-snug text-foreground"
        >
          Optimize Resume Keywords?
        </h2>
        <p className="mt-3 text-[15px] leading-snug text-muted-foreground">
          This will analyze your resume and replace weak or non-standard wording
          with ATS-friendly terminology to improve keyword recognition and
          applicant tracking system compatibility.
        </p>

        <div className="mt-4 space-y-2 rounded-xl bg-muted/40 px-3 py-3">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
            Examples
          </p>
          <ul className="space-y-1.5">
            {ATS_OPTIMIZE_CONFIRM_EXAMPLES.map((example) => (
              <li
                key={`${example.before}-${example.after}`}
                className="text-[14px] leading-snug text-foreground/90"
              >
                <span className="text-muted-foreground">{example.before}</span>
                <span className="mx-1.5 text-muted-foreground">→</span>
                <span className="font-medium">{example.after}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-5 flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button type="button" className="flex-1" onClick={onConfirm}>
            Optimize Resume
          </Button>
        </div>
      </div>
    </div>,
    getAppOverlayRoot(),
  );
}

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

  const steps = [
    "Analyzing Resume",
    "Identifying Weak Keywords",
    "Applying ATS Enhancements",
    "Preparing Preview",
  ];

  return createPortal(
    <div
      className="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-background/95 px-6 backdrop-blur-sm"
      role="status"
      aria-live="polite"
      aria-label="Optimizing resume keywords"
    >
      <div className="relative size-16">
        <div className="absolute inset-0 animate-spin rounded-full border-[3px] border-primary/20 border-t-primary" />
      </div>
      <p className="mt-6 text-[20px] font-semibold text-foreground">
        {steps[stepIndex] ?? steps[steps.length - 1]}
      </p>
      <div className="mt-5 flex w-full max-w-xs flex-col gap-2">
        {steps.map((step, index) => (
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
                "size-2 rounded-full",
                index < stepIndex
                  ? "bg-emerald-400"
                  : index === stepIndex
                    ? "bg-primary animate-pulse"
                    : "bg-muted",
              )}
            />
            {step}
          </div>
        ))}
      </div>
    </div>,
    getAppOverlayRoot(),
  );
}
