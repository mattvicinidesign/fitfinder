"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AtsKeywordOptimizeConfirmModal,
  AtsKeywordOptimizeLoadingOverlay,
} from "@/components/ats-keyword-optimize-modals";
import { showAtsOptimizeError } from "@/lib/ats-optimize-toast";
import { AtsKeywordPreviewDrawer } from "@/components/ats-keyword-preview-drawer";
import { AiGradientPillButton } from "@/components/ai-gradient-pill-button";
import { ResumeReviewAtsCategoryCard } from "@/components/resume-review-ats-category-card";
import { ResumeReviewScoreGauge } from "@/components/resume-review-score-gauge";
import { ResumeReviewCategoryRow } from "@/components/resume-review-ui";
import { safeBottomCta } from "@/lib/safe-area";
import { cn } from "@/lib/utils";
import { patchResumeReviewAtsScore } from "@/lib/patch-resume-review-ats-score";
import {
  applyAtsKeywordOptimization,
  clearAtsKeywordOptimization,
  downloadOptimizedResume,
  isAtsOptimizationApplied,
  isAtsScanPendingReview,
  loadAtsKeywordOptimization,
  saveAtsKeywordOptimization,
  simulateAtsKeywordOptimization,
} from "@/lib/resume-review-ats-optimization";
import { loadResumeReviewFileName, saveResumeReview } from "@/lib/resume-review-cache";
import { isNativePlatform } from "@/lib/platform";
import { getResumeReviewMasterScore } from "@/lib/resume-review-scores";
import type { AtsKeywordChangeDecision, AtsKeywordOptimization, ResumeReviewResult } from "@/lib/types";

export function ResumeReviewResultView({
  review: initialReview,
  fileName,
  animateGauge = false,
  onGaugeAnimationComplete,
}: {
  review: ResumeReviewResult;
  fileName?: string | null;
  animateGauge?: boolean;
  onGaugeAnimationComplete?: () => void;
}) {
  const [review, setReview] = useState(initialReview);
  const [optimization, setOptimization] = useState<AtsKeywordOptimization | null>(
    () => loadAtsKeywordOptimization(initialReview.id),
  );
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loadingOpen, setLoadingOpen] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    setReview(initialReview);
    const cached = loadAtsKeywordOptimization(initialReview.id);
    setOptimization(cached);
    if (isAtsOptimizationApplied(cached)) {
      const patched = patchResumeReviewAtsScore(
        initialReview,
        cached!.optimizedATSScore,
      );
      if (patched.categories.find((c) => c.key === "ats")?.score !==
          initialReview.categories.find((c) => c.key === "ats")?.score) {
        setReview(patched);
        saveResumeReview(patched);
      }
    }
  }, [initialReview]);

  const atsCategory = review.categories.find((category) => category.key === "ats");
  const masterScore = getResumeReviewMasterScore(review);
  const resolvedFileName = fileName ?? loadResumeReviewFileName();

  const handleDownload = useCallback(() => {
    if (!optimization || !isAtsOptimizationApplied(optimization)) return;
    void downloadOptimizedResume(
      optimization.optimizedResumeText,
      fileName ?? loadResumeReviewFileName() ?? "resume.pdf",
    )
      .then(() => {
        toast.success(
          isNativePlatform()
            ? "Choose where to save your resume."
            : "Optimized resume downloaded.",
        );
      })
      .catch(() => {
        toast.error("Could not export the resume. Try again.");
      });
  }, [optimization, fileName]);

  const atsOptimized = Boolean(
    optimization && isAtsOptimizationApplied(optimization),
  );

  const runOptimization = useCallback(async () => {
    if (!atsCategory) return;
    setConfirmOpen(false);
    setLoadingOpen(true);
    setLoadingStep(0);

    try {
      const result = await simulateAtsKeywordOptimization({
        originalATSScore: optimization?.originalATSScore ?? atsCategory.score,
        resumeId: review.resumeId,
        onStep: setLoadingStep,
      });

      saveAtsKeywordOptimization(review.id, result);
      setOptimization(result);
      setPreviewOpen(true);
    } catch (error) {
      showAtsOptimizeError(error);
    } finally {
      setLoadingOpen(false);
    }
  }, [atsCategory, optimization?.originalATSScore, review.id, review.resumeId]);

  const handleApplyOptimization = useCallback(
    (decisions: AtsKeywordChangeDecision[]) => {
      if (!optimization) return;
      const applied = applyAtsKeywordOptimization(review.id, optimization, decisions);
      const patchedReview = patchResumeReviewAtsScore(
        review,
        applied.optimizedATSScore,
      );
      saveResumeReview(patchedReview);
      setReview(patchedReview);
      setOptimization(applied);
      setPreviewOpen(false);
      toast.success("Optimized resume built.");
    },
    [optimization, review],
  );

  const handleDiscardPending = useCallback(() => {
    clearAtsKeywordOptimization(review.id);
    setOptimization(null);
    setPreviewOpen(false);
  }, [review.id]);

  return (
    <>
      <div className={cn("space-y-8", atsOptimized && "pb-28")}>
        <div className="px-4">
          <div className="rounded-2xl border border-border/70 bg-card/50 px-5 py-5">
            <div className="flex flex-col gap-4">
              <ResumeReviewScoreGauge
                key={animateGauge ? `animate-${review.id}` : review.id}
                score={masterScore}
                animate={animateGauge}
                onAnimationComplete={onGaugeAnimationComplete}
              />
              <p className="text-center text-[16px] leading-snug text-foreground/90">
                {review.summary}
              </p>
              {resolvedFileName ? (
                <p className="text-center text-[11px] leading-snug break-all text-muted-foreground">
                  {resolvedFileName}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <section className="space-y-2">
          <h2 className="px-4 text-[13px] font-normal uppercase tracking-wide text-muted-foreground">
            Category scores
          </h2>
          <div className="grid grid-cols-2 items-start gap-3 px-4">
            {review.categories.map((category, index) =>
              category.key === "ats" ? (
                <ResumeReviewAtsCategoryCard
                  key={category.key}
                  category={category}
                  optimization={optimization}
                  onOptimizeKeywords={() => setConfirmOpen(true)}
                  onPreviewChanges={() => setPreviewOpen(true)}
                  animate={animateGauge}
                  animateDelay={index * 75}
                />
              ) : (
                <ResumeReviewCategoryRow
                  key={category.key}
                  category={category}
                  animate={animateGauge}
                  animateDelay={index * 75}
                />
              ),
            )}
          </div>
        </section>
      </div>

      {atsOptimized ? (
        <>
          <div
            aria-hidden
            className="pointer-events-none fixed inset-x-0 bottom-[calc(58px+max(0px,env(safe-area-inset-bottom)))] z-20 mx-auto h-24 max-w-[480px] bg-gradient-to-t from-background from-[28%] via-background/80 via-[58%] to-transparent"
          />
          <div
            className={cn(
              "pointer-events-none fixed inset-x-0 z-30 mx-auto max-w-[480px] px-4 pt-3",
              "bottom-[calc(58px+max(0px,env(safe-area-inset-bottom))+0.75rem)]",
              safeBottomCta,
            )}
          >
            <AiGradientPillButton
              size="large"
              showIcon={false}
              className="pointer-events-auto w-full"
              onClick={handleDownload}
            >
              Download Optimized Resume
            </AiGradientPillButton>
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
          mode={
            isAtsScanPendingReview(optimization) ? "review" : "view"
          }
          onApply={handleApplyOptimization}
          onDiscard={handleDiscardPending}
        />
      ) : null}
    </>
  );
}
