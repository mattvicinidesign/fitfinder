"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CircleBackButton } from "@/components/ui/circle-back-button";
import {
  SCREEN_REGULAR_CTA_CLASS,
} from "@/components/resume-upload-styles";
import { SummarySectionCard } from "@/components/summary-section-card";
import { buildPhraseBoundaryPattern } from "@/lib/ats-keyword-optimization-core";
import { getAppOverlayRoot } from "@/lib/overlay-portal";
import { APP_PORTAL_OVERLAY_Z } from "@/lib/overlay-z-index";
import { getAppliedKeywordChangesForDisplay } from "@/lib/resume-review-ats-optimization";
import { safeBottomOverlay, safeTopSheetHeader } from "@/lib/safe-area";
import type { AtsKeywordChange, AtsKeywordOptimization } from "@/lib/types";
import { cn } from "@/lib/utils";

type HighlightRange = { start: number; end: number };

function escapeHighlightRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Highlight each applied `after` phrase at its known matchIndex.
 * Avoids character-diff highlights that only mark shared-prefix tails
 * (e.g. wireframes→wireframing would otherwise only mark "ing").
 */
function buildAppliedKeywordHighlightRanges(
  optimizedText: string,
  originalText: string,
  changes: AtsKeywordChange[],
): HighlightRange[] {
  if (!optimizedText || changes.length === 0) return [];

  const lines = optimizedText.split("\n");
  const lineStarts: number[] = [];
  let offset = 0;
  for (let i = 0; i < lines.length; i += 1) {
    lineStarts.push(offset);
    offset += lines[i]!.length + (i < lines.length - 1 ? 1 : 0);
  }

  const ranges: HighlightRange[] = [];

  for (let index = 0; index < changes.length; index += 1) {
    const change = changes[index]!;
    let start = -1;
    let end = -1;

    if (
      typeof change.lineIndex === "number" &&
      typeof change.matchIndex === "number"
    ) {
      const line = lines[change.lineIndex];
      const lineStart = lineStarts[change.lineIndex];
      if (line != null && lineStart != null) {
        const from = change.matchIndex;
        const rest = line.slice(from);
        const afterParts = change.after
          .trim()
          .split(/\s+/)
          .filter(Boolean)
          .map(escapeHighlightRegExp);
        const startAnchored = new RegExp(
          `^${afterParts.join("\\s+")}`,
          "i",
        );
        const anchored = startAnchored.exec(rest);
        if (anchored) {
          start = lineStart + from;
          end = start + anchored[0].length;
        } else {
          const pattern = buildPhraseBoundaryPattern(change.after, "gi");
          let match: RegExpExecArray | null;
          let fallback: RegExpExecArray | null = null;
          while ((match = pattern.exec(line)) !== null) {
            if (match.index === from) {
              start = lineStart + match.index;
              end = start + match[0].length;
              break;
            }
            if (fallback == null && match.index >= from) {
              fallback = match;
            }
          }
          if (start < 0 && fallback) {
            start = lineStart + fallback.index;
            end = start + fallback[0].length;
          }
        }
      }
    }

    if (start < 0) {
      const occurrence = changes
        .slice(0, index)
        .filter(
          (prior) =>
            prior.after.toLowerCase() === change.after.toLowerCase(),
        ).length;
      const originalCount = originalText
        ? (
            originalText.match(
              buildPhraseBoundaryPattern(change.after, "gi"),
            ) ?? []
          ).length
        : 0;
      const targetOccurrence = originalCount + occurrence;
      const pattern = buildPhraseBoundaryPattern(change.after, "gi");
      let matchIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(optimizedText)) !== null) {
        if (matchIndex === targetOccurrence) {
          start = match.index;
          end = start + match[0].length;
          break;
        }
        matchIndex += 1;
      }
    }

    if (start >= 0 && end > start) {
      ranges.push({ start, end });
    }
  }

  ranges.sort((a, b) => a.start - b.start);
  const merged: HighlightRange[] = [];
  for (const range of ranges) {
    const last = merged[merged.length - 1];
    if (last && range.start < last.end) {
      last.end = Math.max(last.end, range.end);
    } else {
      merged.push({ ...range });
    }
  }
  return merged;
}

function HighlightedResumePreviewText({
  text,
  originalText,
  changes,
}: {
  text: string;
  originalText: string;
  changes: AtsKeywordChange[];
}) {
  const ranges = useMemo(
    () => buildAppliedKeywordHighlightRanges(text, originalText, changes),
    [text, originalText, changes],
  );

  if (ranges.length === 0) {
    return <>{text}</>;
  }

  const parts: ReactNode[] = [];
  let cursor = 0;
  for (const [index, range] of ranges.entries()) {
    if (cursor < range.start) {
      parts.push(text.slice(cursor, range.start));
    }
    parts.push(
      <mark
        key={`kw-${index}-${range.start}`}
        className="rounded-sm bg-emerald-500/25 px-0.5 font-semibold text-emerald-300"
      >
        {text.slice(range.start, range.end)}
      </mark>,
    );
    cursor = range.end;
  }
  if (cursor < text.length) {
    parts.push(text.slice(cursor));
  }
  return <>{parts}</>;
}

export function AtsOptimizedResumePreviewDrawer({
  open,
  variant = "confirm",
  onClose,
  onBackToSuggestions,
  optimization,
  onDownload,
  downloading = false,
}: {
  open: boolean;
  /** confirm = post-apply export flow; browse = reopen preview from results. */
  variant?: "confirm" | "browse";
  onClose: () => void;
  /** Return to Suggested Changes so approvals can be edited (confirm only). */
  onBackToSuggestions?: () => void;
  optimization: AtsKeywordOptimization;
  onDownload: () => void;
  downloading?: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  const isBrowse = variant === "browse";

  const appliedChanges = useMemo(
    () => getAppliedKeywordChangesForDisplay(optimization),
    [optimization],
  );

  // Keep original offsets so lineIndex/matchIndex highlights stay accurate.
  const previewText = optimization.optimizedResumeText;

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleDismiss = useCallback(() => {
    if (isBrowse || !onBackToSuggestions) {
      onClose();
      return;
    }
    onBackToSuggestions();
  }, [isBrowse, onBackToSuggestions, onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") handleDismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, handleDismiss]);

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
          "flex shrink-0 items-start gap-3 border-b border-border/60 px-4 pb-3",
          safeTopSheetHeader,
        )}
      >
        {isBrowse ? null : (
          <CircleBackButton
            className="mt-0.5"
            aria-label="Back to suggested changes"
            onClick={handleDismiss}
          />
        )}
        <div className="min-w-0 flex-1">
          <h2
            id="ats-optimized-preview-title"
            className="text-[22px] font-bold leading-tight tracking-tight"
          >
            {isBrowse ? "Optimized Resume" : "Preview and Export Changes"}
          </h2>
          <p className="mt-1.5 text-[14px] leading-snug text-muted-foreground">
            {appliedChanges.length > 0
              ? "Changed keywords are highlighted in green. Your structure and metrics stay the same."
              : "Preview your optimized resume before downloading."}
          </p>
        </div>
        {isBrowse ? (
          <button
            type="button"
            onClick={handleDismiss}
            className="-mr-1 mt-0.5 shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        ) : null}
      </header>

      <div className="relative min-h-0 flex-1">
        <div
          className={cn(
            "h-full overflow-y-auto overscroll-contain touch-pan-y px-4 pt-4",
            isBrowse
              ? "pb-[calc(1.5rem+max(1.5rem,env(safe-area-inset-bottom)))]"
              : "pb-[calc(4.75rem+max(1.5rem,env(safe-area-inset-bottom)))]",
          )}
        >
          <SummarySectionCard title="Resume preview">
            {previewText.trim() ? (
              <pre className="max-h-none whitespace-pre-wrap break-words font-mono text-[13px] leading-relaxed text-foreground/90">
                <HighlightedResumePreviewText
                  text={previewText}
                  originalText={optimization.originalResumeText}
                  changes={appliedChanges}
                />
              </pre>
            ) : (
              <p className="text-[14px] leading-relaxed text-muted-foreground">
                No preview text is available. Download your optimized resume to
                view the final file.
              </p>
            )}
          </SummarySectionCard>
        </div>

        {isBrowse ? null : (
          <>
            <div
              aria-hidden
              className={cn(
                "pointer-events-none absolute inset-x-0 bottom-0 z-10",
                "h-[calc(6.75rem+max(1.5rem,env(safe-area-inset-bottom)))]",
                "bg-gradient-to-t from-background from-[28%] via-background/80 via-[58%] to-transparent",
              )}
            />

            <footer
              className={cn(
                "pointer-events-none absolute inset-x-0 bottom-0 z-20 px-4 pt-3",
                safeBottomOverlay,
              )}
            >
              <div className="pointer-events-auto">
                <Button
                  type="button"
                  className={SCREEN_REGULAR_CTA_CLASS}
                  onClick={onDownload}
                  disabled={downloading}
                >
                  {downloading
                    ? "Preparing download…"
                    : "Confirm Changes and Export"}
                </Button>
              </div>
            </footer>
          </>
        )}
      </div>
    </div>,
    getAppOverlayRoot(),
  );
}
