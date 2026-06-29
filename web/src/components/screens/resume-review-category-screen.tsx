"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { toast } from "sonner";
import { showAtsOptimizeError } from "@/lib/ats-optimize-toast";
import { useResumeReviewCategorySheetClose } from "@/components/app-shell/resume-review-category-sheet-context";
import {
  AtsKeywordOptimizeConfirmModal,
  AtsKeywordOptimizeLoadingOverlay,
} from "@/components/ats-keyword-optimize-modals";
import { AtsKeywordPreviewDrawer } from "@/components/ats-keyword-preview-drawer";
import { Button } from "@/components/ui/button";
import { RESUME_REVIEW_PRIMARY_CTA_CLASS } from "@/components/resume-upload-styles";
import { Card, CardContent } from "@/components/ui/card";
import {
  FindingRow,
  formatResumeReviewScorePercent,
  ImprovementAlertRow,
  NextStepRow,
  partitionResumeReviewFindings,
  ScoreProgressBar,
} from "@/components/resume-review-ui";
import { ResumeReviewResourcesSection } from "@/components/resume-review-resources-section";
import { safeBottomCta, safeBottomOverlay, safeTopSheetHeader } from "@/lib/safe-area";
import {
  applyAtsKeywordOptimization,
  clearAtsKeywordOptimization,
  buildOptimizedResumeDownloadInput,
  downloadAppliedAtsOptimization,
  downloadOptimizedResume,
  showOptimizedResumeExportToast,
  getAppliedKeywordChangesForDisplay,
  isAtsOptimizationApplied,
  isAtsScanPendingReview,
  loadAtsKeywordOptimization,
  saveAtsKeywordOptimization,
  simulateAtsKeywordOptimization,
} from "@/lib/resume-review-ats-optimization";
import {
  getResumeReviewCategory,
  getResumeReviewCategoryLabel,
  getResumeReviewImprovementForCategory,
  isResumeReviewCategoryKey,
} from "@/lib/resume-review-categories";
import { loadResumeReview, loadResumeReviewFileName, saveResumeReview } from "@/lib/resume-review-cache";
import {
  ATS_OPTIMIZED_CATEGORY_EXPLANATION,
  patchResumeReviewAtsScore,
} from "@/lib/patch-resume-review-ats-score";
import { goBackToResumeReview } from "@/lib/navigate-app";
import {
  expandPreviewImprovementTitles,
  expandPreviewNeedsImprovementFindings,
  expandPreviewNextSteps,
  expandPreviewStrengths,
} from "@/lib/resume-review-category-preview";
import type { AtsKeywordChangeDecision, AtsKeywordOptimization, ResumeReviewCategoryKey } from "@/lib/types";
import { cn } from "@/lib/utils";

function KeywordChangeRow({ before, after }: { before: string; after: string }) {
  return (
    <li className="text-[15px] leading-snug">
      <span className="text-muted-foreground">{before}</span>
      <span className="mx-1.5 text-muted-foreground">→</span>
      <span className="font-medium text-foreground">{after}</span>
    </li>
  );
}

export function ResumeReviewCategoryScreen({
  categoryKey,
}: {
  categoryKey: string;
}) {
  const router = useRouter();
  const closeCategory = useResumeReviewCategorySheetClose();
  const review = loadResumeReview();
  const validKey = isResumeReviewCategoryKey(categoryKey)
    ? categoryKey
    : null;
  const category =
    review && validKey
      ? getResumeReviewCategory(review, validKey as ResumeReviewCategoryKey)
      : null;
  const improvement =
    review && validKey
      ? getResumeReviewImprovementForCategory(
          review,
          validKey as ResumeReviewCategoryKey,
        )
      : null;
  const reviewId = review?.id ?? null;
  const hasValidCategory = Boolean(review && validKey && category);
  const [optimization, setOptimization] = useState<AtsKeywordOptimization | null>(
    null,
  );
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loadingOpen, setLoadingOpen] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState<"review" | "applied">("review");

  const openAppliedReview = useCallback(() => {
    setPreviewMode("applied");
    setPreviewOpen(true);
  }, []);

  useEffect(() => {
    if (!reviewId) return;
    setOptimization(loadAtsKeywordOptimization(reviewId));
  }, [reviewId]);

  useEffect(() => {
    if (hasValidCategory) return;
    goBackToResumeReview(router);
  }, [hasValidCategory, router]);

  const runOptimization = useCallback(async () => {
    if (!review) return;
    const ats = review.categories.find((category) => category.key === "ats");
    if (!ats) return;
    setConfirmOpen(false);
    setLoadingOpen(true);
    setLoadingStep(0);

    try {
      const result = await simulateAtsKeywordOptimization({
        originalATSScore: optimization?.originalATSScore ?? ats.score,
        resumeId: review.resumeId,
        onStep: setLoadingStep,
      });

      saveAtsKeywordOptimization(review.id, result);
      setOptimization(result);
      setPreviewMode("review");
      setPreviewOpen(true);
    } catch (error) {
      showAtsOptimizeError(error);
    } finally {
      setLoadingOpen(false);
    }
  }, [review, optimization?.originalATSScore]);

  if (!review || !validKey || !category) {
    return null;
  }

  const isAts = validKey === "ats";
  const atsCategory = review.categories.find((category) => category.key === "ats");
  const atsApplied = isAts && isAtsOptimizationApplied(optimization);
  const atsPendingReview = isAts && isAtsScanPendingReview(optimization);
  const showFloatingOptimize =
    isAts && Boolean(atsCategory) && !atsApplied && !atsPendingReview;
  const showFloatingAtsActions = atsApplied;
  const showFloatingBottom = showFloatingOptimize || showFloatingAtsActions;
  const displayScore = atsApplied
    ? optimization!.optimizedATSScore
    : category.score;

  const handleDownload = () => {
    if (!isAtsOptimizationApplied(optimization)) return;
    const sourceFileName = loadResumeReviewFileName() ?? "resume.pdf";
    void downloadOptimizedResume(
      buildOptimizedResumeDownloadInput(
        optimization!,
        sourceFileName,
        review?.resumeId,
      ),
    )
      .then((result) => {
        showOptimizedResumeExportToast(result);
      })
      .catch((error) => {
        toast.error(
          error instanceof Error
            ? error.message
            : "Could not export the resume. Try again.",
        );
      });
  };

  const handleApplyOptimization = (decisions: AtsKeywordChangeDecision[]) => {
    if (!review || !optimization) return;
    try {
      const applied = applyAtsKeywordOptimization(review.id, optimization, decisions);
      const patchedReview = patchResumeReviewAtsScore(
        review,
        applied.optimizedATSScore,
      );
      saveResumeReview(patchedReview);
      setOptimization(applied);
      setPreviewOpen(false);

      const sourceFileName = loadResumeReviewFileName() ?? "resume.pdf";
      void downloadAppliedAtsOptimization({
        optimization: applied,
        sourceFileName,
        resumeId: review.resumeId,
      }).catch(() => {
        toast.error("Could not export the resume. Try again.");
      });
    } catch (error) {
      showAtsOptimizeError(error);
    }
  };

  const handleDiscardPending = () => {
    if (!review) return;
    clearAtsKeywordOptimization(review.id);
    setOptimization(null);
    setPreviewOpen(false);
  };

  const activeCategoryKey = validKey as ResumeReviewCategoryKey;
  const { strengths: rawStrengths, needsImprovement: rawNeedsImprovement } =
    partitionResumeReviewFindings(category.findings);
  const strengths = expandPreviewStrengths(rawStrengths, activeCategoryKey);
  const needsImprovement = expandPreviewNeedsImprovementFindings(
    rawNeedsImprovement,
    activeCategoryKey,
  );
  const showImprovement = Boolean(improvement && !atsApplied);
  const improvementTitles = expandPreviewImprovementTitles(
    showImprovement ? [improvement!.title] : [],
    activeCategoryKey,
  );
  const hasNeedsImprovementContent =
    needsImprovement.length > 0 || improvementTitles.length > 0;
  const nextSteps = expandPreviewNextSteps(
    showImprovement && improvement!.detail?.trim()
      ? [improvement!.detail.trim()]
      : [],
    activeCategoryKey,
  );

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <header
        className={cn(
          "shrink-0 border-b border-border/60 px-4 pb-3",
          safeTopSheetHeader,
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-[22px] font-bold leading-tight tracking-tight">
              {getResumeReviewCategoryLabel(validKey as ResumeReviewCategoryKey)}
            </h1>
            <p className="mt-1.5 text-[15px] leading-snug text-muted-foreground">
              {atsApplied
                ? ATS_OPTIMIZED_CATEGORY_EXPLANATION
                : category.explanation}
            </p>
          </div>
          <button
            type="button"
            onClick={() => closeCategory?.()}
            aria-label="Close category details"
            className="-mr-1 mt-0.5 inline-flex shrink-0 items-center rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
          >
            <X className="size-5 shrink-0" aria-hidden />
          </button>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <span className="text-[34px] font-bold tabular-nums leading-none text-foreground">
            {formatResumeReviewScorePercent(displayScore)}
          </span>
        </div>
        <ScoreProgressBar
          score={displayScore}
          label={getResumeReviewCategoryLabel(validKey as ResumeReviewCategoryKey)}
          className="mt-3 h-2"
        />
      </header>

      <div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto overscroll-contain touch-pan-y",
          safeBottomOverlay,
          showFloatingBottom && "pb-28",
        )}
      >
        <div className="space-y-6 px-4 py-6 pb-8">
          {atsApplied ? (
            <section className="space-y-3">
              <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
                ATS Keyword Optimization Results
              </h2>
              <Card className="gap-0 py-0 ring-border/60">
                <CardContent className="space-y-4 px-4 py-4">
                  <p className="text-[15px] text-foreground">
                    Keywords applied:{" "}
                    <span className="font-semibold tabular-nums">
                      {getAppliedKeywordChangesForDisplay(optimization!).length}
                    </span>
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={openAppliedReview}
                  >
                    Review replacements
                  </Button>
                  <div className="space-y-2">
                    <p className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Examples
                    </p>
                    <ul className="space-y-2">
                      {getAppliedKeywordChangesForDisplay(optimization!)
                        .slice(0, 3)
                        .map((change, index) => (
                        <KeywordChangeRow
                          key={`${change.before}-${change.after}-${index}`}
                          before={change.before}
                          after={change.after}
                        />
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </section>
          ) : atsPendingReview ? (
            <section className="space-y-3">
              <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
                Keyword scan ready
              </h2>
              <Card className="gap-0 py-0 ring-border/60">
                <CardContent className="space-y-3 px-4 py-4">
                  <p className="text-[15px] leading-snug text-muted-foreground">
                    Your scan found{" "}
                    <span className="font-semibold text-foreground">
                      {optimization!.keywordChanges.length}
                    </span>{" "}
                    keyword updates. Review them before building your resume.
                  </p>
                  <Button type="button" onClick={() => {
                    setPreviewMode("review");
                    setPreviewOpen(true);
                  }}>
                    Review changes
                  </Button>
                </CardContent>
              </Card>
            </section>
          ) : null}

          <section className="space-y-3">
            <h2 className="text-[15px] font-semibold text-foreground">
              What looks good
            </h2>
            <Card className="gap-0 py-0 ring-border/60">
              <CardContent className="px-4 py-3">
                {strengths.length > 0 ? (
                  <ul className="space-y-2.5">
                    {strengths.map((finding) => (
                      <FindingRow key={finding.label} finding={finding} />
                    ))}
                  </ul>
                ) : (
                  <p className="text-[15px] text-muted-foreground">
                    No strengths flagged for this category yet.
                  </p>
                )}
              </CardContent>
            </Card>
          </section>

          <section className="space-y-3">
            <h2 className="text-[15px] font-semibold text-foreground">
              What needs improvement
            </h2>
            {hasNeedsImprovementContent ? (
              <Card className="gap-0 py-0 ring-border/60">
                <CardContent className="px-4 py-3">
                  <ul className="space-y-2.5">
                    {needsImprovement.map((finding, index) => (
                      <FindingRow key={`${finding.label}-${index}`} finding={finding} />
                    ))}
                    {improvementTitles.map((title, index) => (
                      <ImprovementAlertRow key={`${title}-${index}`} title={title} />
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ) : (
              <Card className="gap-0 py-0 ring-border/60">
                <CardContent className="px-4 py-3">
                  <p className="text-[15px] text-muted-foreground">
                    Nothing flagged for improvement in this category.
                  </p>
                </CardContent>
              </Card>
            )}
          </section>

          {nextSteps.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-[15px] font-semibold text-foreground">
                What to do next
              </h2>
              <Card className="gap-0 py-0 ring-border/60">
                <CardContent className="px-4 py-3">
                  <ul className="space-y-2.5">
                    {nextSteps.map((step, index) => (
                      <NextStepRow key={`${step}-${index}`} text={step} />
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </section>
          ) : null}

          <ResumeReviewResourcesSection
            categoryKey={validKey as ResumeReviewCategoryKey}
          />
        </div>
      </div>

      {showFloatingBottom ? (
        <>
          <div
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-background from-[28%] via-background/80 via-[58%] to-transparent",
              showFloatingAtsActions ? "h-28" : "h-24",
            )}
          />
          <div
            className={cn(
              "absolute inset-x-0 bottom-0 z-20 px-4 pt-3",
              safeBottomCta,
            )}
          >
            {showFloatingAtsActions ? (
              <div className="space-y-2">
                <Button
                  type="button"
                  className={RESUME_REVIEW_PRIMARY_CTA_CLASS}
                  onClick={openAppliedReview}
                >
                  Review replacements
                </Button>
                <Button
                  type="button"
                  className={RESUME_REVIEW_PRIMARY_CTA_CLASS}
                  onClick={handleDownload}
                >
                  Download Optimized Resume
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                className={RESUME_REVIEW_PRIMARY_CTA_CLASS}
                onClick={() => setConfirmOpen(true)}
              >
                Optimize
                <span className="ml-2 rounded-full border border-primary-foreground/25 bg-primary-foreground/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider">
                  Beta
                </span>
              </Button>
            )}
          </div>
        </>
      ) : null}

      <AtsKeywordOptimizeConfirmModal
        open={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => void runOptimization()}
      />
      <AtsKeywordOptimizeLoadingOverlay open={loadingOpen} stepIndex={loadingStep} />
      {optimization?.scanCompleted ? (
        <AtsKeywordPreviewDrawer
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          optimization={optimization}
          mode={previewMode}
          onApply={handleApplyOptimization}
          onDiscard={handleDiscardPending}
        />
      ) : null}
    </div>
  );
}
