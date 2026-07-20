"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SummarySectionCard } from "@/components/summary-section-card";
import { getAppOverlayRoot } from "@/lib/overlay-portal";
import { APP_PORTAL_OVERLAY_Z } from "@/lib/overlay-z-index";
import { getAppliedKeywordChangesForDisplay } from "@/lib/resume-review-ats-optimization";
import { safeBottomOverlay, safeTopSheetHeader } from "@/lib/safe-area";
import type { AtsKeywordOptimization } from "@/lib/types";
import { cn } from "@/lib/utils";

export function AtsOptimizedResumePreviewDrawer({
  open,
  onClose,
  optimization,
  onPreviewReplacements,
  onDownload,
  downloading = false,
}: {
  open: boolean;
  onClose: () => void;
  optimization: AtsKeywordOptimization;
  onPreviewReplacements: () => void;
  onDownload: () => void;
  downloading?: boolean;
}) {
  const [mounted, setMounted] = useState(false);

  const appliedChanges = useMemo(
    () => getAppliedKeywordChangesForDisplay(optimization),
    [optimization],
  );

  const previewText = optimization.optimizedResumeText.trim();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, handleClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className={cn(
        "absolute inset-0 flex min-h-0 flex-col overflow-hidden bg-background",
        APP_PORTAL_OVERLAY_Z,
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ats-optimized-preview-title"
    >
      <header
        className={cn(
          "flex shrink-0 items-start justify-between gap-3 border-b border-border/60 px-4 pb-3",
          safeTopSheetHeader,
        )}
      >
        <div className="min-w-0 flex-1">
          <h2
            id="ats-optimized-preview-title"
            className="text-[22px] font-bold leading-tight tracking-tight"
          >
            Optimized resume
          </h2>
          <p className="mt-1.5 text-[14px] leading-snug text-muted-foreground">
            {appliedChanges.length > 0
              ? `${appliedChanges.length} keyword ${appliedChanges.length === 1 ? "swap" : "swaps"} applied. Your structure and metrics are unchanged.`
              : "Preview your optimized resume before downloading."}
          </p>
        </div>
        <button
          type="button"
          onClick={handleClose}
          className="-mr-1 mt-0.5 shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
          aria-label="Close"
        >
          <X className="size-5" />
        </button>
      </header>

      <div className="relative min-h-0 flex-1">
        <div
          className={cn(
            "h-full overflow-y-auto overscroll-contain touch-pan-y px-4 pt-4",
            "pb-[calc(7.5rem+max(1.5rem,env(safe-area-inset-bottom)))]",
          )}
        >
          <SummarySectionCard title="Resume preview">
            {previewText ? (
              <pre className="max-h-none whitespace-pre-wrap break-words font-mono text-[13px] leading-relaxed text-foreground/90">
                {previewText}
              </pre>
            ) : (
              <p className="text-[14px] leading-relaxed text-muted-foreground">
                No preview text is available. Download your optimized resume to
                view the final file.
              </p>
            )}
          </SummarySectionCard>
        </div>

        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-x-0 bottom-0 z-10",
            "h-[calc(8rem+max(1.5rem,env(safe-area-inset-bottom)))]",
            "bg-gradient-to-t from-background from-[28%] via-background/80 via-[58%] to-transparent",
          )}
        />

        <footer
          className={cn(
            "pointer-events-none absolute inset-x-0 bottom-0 z-20 px-4 pt-3",
            safeBottomOverlay,
          )}
        >
          <div className="pointer-events-auto space-y-2">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={onPreviewReplacements}
              disabled={appliedChanges.length === 0}
            >
              Preview replacements
            </Button>
            <Button
              type="button"
              className="w-full"
              onClick={onDownload}
              disabled={downloading}
            >
              {downloading ? "Preparing download…" : "Download optimized resume"}
            </Button>
          </div>
        </footer>
      </div>
    </div>,
    getAppOverlayRoot(),
  );
}
