"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { AtsKeywordChangeAccordion } from "@/components/ats-keyword-change-accordion";
import { Button } from "@/components/ui/button";
import { getAppOverlayRoot } from "@/lib/overlay-portal";
import { buildAtsKeywordChangeSnippets } from "@/lib/ats-keyword-change-snippets";
import {
  allKeywordChangesReviewed,
  ATS_PREVIEW_KEYWORD_CHANGE_COUNT,
  createPendingKeywordChangeDecisions,
  hasApprovedKeywordChanges,
} from "@/lib/resume-review-ats-optimization";
import { safeBottomOverlay, safeTopCompact } from "@/lib/safe-area";
import type { AtsKeywordChangeDecision, AtsKeywordOptimization } from "@/lib/types";
import { cn } from "@/lib/utils";

export function AtsKeywordPreviewDrawer({
  open,
  onClose,
  optimization,
  mode = "view",
  onApply,
  onDiscard,
}: {
  open: boolean;
  onClose: () => void;
  optimization: AtsKeywordOptimization;
  mode?: "review" | "view";
  onApply?: (decisions: AtsKeywordChangeDecision[]) => void;
  onDiscard?: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const isReview = mode === "review";

  const previewChanges = useMemo(
    () => optimization.keywordChanges.slice(0, ATS_PREVIEW_KEYWORD_CHANGE_COUNT),
    [optimization.keywordChanges],
  );

  const changeSnippets = useMemo(
    () =>
      buildAtsKeywordChangeSnippets(
        optimization.originalResumeText,
        previewChanges,
      ),
    [optimization.originalResumeText, previewChanges],
  );

  const [decisions, setDecisions] = useState<AtsKeywordChangeDecision[]>(() =>
    optimization.keywordChangeDecisions ??
      createPendingKeywordChangeDecisions(previewChanges.length),
  );

  useEffect(() => {
    if (!open) return;
    setDecisions(
      optimization.keywordChangeDecisions ??
        createPendingKeywordChangeDecisions(previewChanges.length),
    );
  }, [open, optimization.keywordChangeDecisions, previewChanges.length]);

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

  const approvedCount = decisions.filter((decision) => decision === "approved").length;
  const rejectedCount = decisions.filter((decision) => decision === "rejected").length;
  const allApproved =
    previewChanges.length > 0 &&
    decisions.slice(0, previewChanges.length).every((decision) => decision === "approved");
  const canBuild =
    allKeywordChangesReviewed(decisions, previewChanges.length) &&
    hasApprovedKeywordChanges(decisions);

  const approveAll = useCallback(() => {
    setDecisions(previewChanges.map(() => "approved" as const));
  }, [previewChanges]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="absolute inset-0 z-50 flex min-h-0 flex-col overflow-hidden bg-background"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ats-preview-title"
    >
      <header
        className={cn(
          "flex shrink-0 items-start justify-between gap-3 border-b border-border/60 px-4 pb-3",
          safeTopCompact,
        )}
      >
        <div className="min-w-0 pt-1">
          <h2 id="ats-preview-title" className="text-[20px] font-bold leading-tight">
            Verify Changes
          </h2>
          {isReview ? (
            <p className="mt-1 text-[14px] leading-snug text-muted-foreground">
              Approve or reject each keyword update before building your resume.
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={handleClose}
          className="mt-1 shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-muted/40"
          aria-label="Close"
        >
          <X className="size-5" />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
        <section className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
              Keyword updates
            </h3>
            {isReview ? (
              <div className="flex items-center gap-2">
                <p className="text-[12px] tabular-nums text-muted-foreground">
                  {approvedCount} approved · {rejectedCount} rejected
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-2.5 text-[12px]"
                  disabled={allApproved}
                  onClick={approveAll}
                >
                  Approve all
                </Button>
              </div>
            ) : null}
          </div>
          <ul className="space-y-2">
            {previewChanges.map((change, index) => (
              <AtsKeywordChangeAccordion
                key={`${change.before}-${change.after}-${index}`}
                before={change.before}
                after={change.after}
                snippet={changeSnippets[index]!}
                decision={decisions[index] ?? "pending"}
                reviewMode={isReview}
                onApprove={() => {
                  setDecisions((current) => {
                    const next = [...current];
                    next[index] = "approved";
                    return next;
                  });
                }}
                onReject={() => {
                  setDecisions((current) => {
                    const next = [...current];
                    next[index] = "rejected";
                    return next;
                  });
                }}
              />
            ))}
          </ul>
        </section>
      </div>

      <footer
        className={cn(
          "shrink-0 border-t border-border/60 bg-background px-4 py-3",
          safeBottomOverlay,
        )}
      >
        {isReview ? (
          <div className="space-y-2">
            {!canBuild ? (
              <p className="text-center text-[12px] text-muted-foreground">
                Review every update and approve at least one to build your resume.
              </p>
            ) : null}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => onDiscard?.()}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="flex-1"
                disabled={!canBuild}
                onClick={() => onApply?.(decisions)}
              >
                Build the resume
              </Button>
            </div>
          </div>
        ) : (
          <Button type="button" className="w-full" onClick={handleClose}>
            Done
          </Button>
        )}
      </footer>
    </div>,
    getAppOverlayRoot(),
  );
}
