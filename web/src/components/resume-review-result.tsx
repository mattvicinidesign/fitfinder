"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AtsKeywordOptimizeLoadingOverlay } from "@/components/ats-keyword-optimize-modals";
import { showAtsOptimizeError } from "@/lib/ats-optimize-toast";
import { AtsKeywordPreviewDrawer } from "@/components/ats-keyword-preview-drawer";
import { AtsOptimizedResumePreviewDrawer } from "@/components/ats-optimized-resume-preview-drawer";
import { Button } from "@/components/ui/button";
import { FORM_FIELD_LABEL_CLASS } from "@/components/form-field-styles";
import {
  RESUME_REVIEW_PREVIEW_CTA_CLASS,
  RESUME_REVIEW_PRIMARY_CTA_CLASS,
} from "@/components/resume-upload-styles";
import { ResumeReviewAtsCategoryCard } from "@/components/resume-review-ats-category-card";
import { ResumeReviewScoreGauge } from "@/components/resume-review-score-gauge";
import { ResumeReviewCategoryRow } from "@/components/resume-review-ui";
import {
  StickyBottomCta,
  StickyScreenBody,
} from "@/components/ui/sticky-bottom-cta";
import { cn } from "@/lib/utils";
import { patchResumeReviewAtsScore } from "@/lib/patch-resume-review-ats-score";
import {
  resolveResumeIdForOptimization,
  resolveResumeTextForOptimization,
} from "@/lib/resume-parse-tracker";
import {
  applyAtsKeywordOptimization,
  clearAtsKeywordOptimization,
  buildOptimizedResumeDownloadInput,
  downloadOptimizedResume,
  showOptimizedResumeExportToast,
  isAtsOptimizationApplied,
  isAtsScanPendingReview,
  loadAtsKeywordOptimization,
  reopenAtsKeywordOptimizationForReview,
  saveAtsKeywordOptimization,
  simulateAtsKeywordOptimization,
} from "@/lib/resume-review-ats-optimization";
import { loadResumeReviewFileName, saveResumeReview } from "@/lib/resume-review-cache";
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
  const [loadingOpen, setLoadingOpen] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState<"review" | "applied">("review");
  const [optimizedPreviewOpen, setOptimizedPreviewOpen] = useState(false);
  const [optimizedPreviewVariant, setOptimizedPreviewVariant] = useState<
    "confirm" | "browse"
  >("confirm");
  const [downloading, setDownloading] = useState(false);

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

  useEffect(() => {
    void resolveResumeIdForOptimization(review.resumeId).then((resumeId) => {
      if (resumeId) void resolveResumeTextForOptimization(resumeId);
    });
  }, [review.resumeId]);

  const atsCategory = review.categories.find((category) => category.key === "ats");
  const masterScore = getResumeReviewMasterScore(review);
  const resolvedFileName = fileName ?? loadResumeReviewFileName();

  const handleDownload = useCallback(() => {
    if (!optimization || !isAtsOptimizationApplied(optimization)) return;
    const sourceFileName =
      fileName ?? loadResumeReviewFileName() ?? "resume.pdf";
    setDownloading(true);
    void downloadOptimizedResume(
      buildOptimizedResumeDownloadInput(
        optimization,
        sourceFileName,
        review.resumeId,
      ),
    )
      .then((result) => {
        showOptimizedResumeExportToast(result);
        setOptimizedPreviewOpen(false);
      })
      .catch((error) => {
        toast.error(
          error instanceof Error
            ? error.message
            : "Could not export the resume. Try again.",
        );
      })
      .finally(() => {
        setDownloading(false);
      });
  }, [optimization, fileName, review.resumeId]);

  const openOptimizedPreview = useCallback(() => {
    setOptimizedPreviewVariant("browse");
    setOptimizedPreviewOpen(true);
  }, []);

  const atsOptimized = Boolean(
    optimization && isAtsOptimizationApplied(optimization),
  );

  const runOptimization = useCallback(async () => {
    if (!atsCategory) return;
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
      setPreviewMode("review");
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
      try {
        const applied = applyAtsKeywordOptimization(
          review.id,
          optimization,
          decisions,
        );
        const patchedReview = patchResumeReviewAtsScore(
          review,
          applied.optimizedATSScore,
        );
        saveResumeReview(patchedReview);
        setReview(patchedReview);
        setOptimization(applied);
        setPreviewOpen(false);
        setOptimizedPreviewVariant("confirm");
        setOptimizedPreviewOpen(true);
      } catch (error) {
        showAtsOptimizeError(error);
      }
    },
    [optimization, review, fileName],
  );

  const handleDiscardPending = useCallback(() => {
    clearAtsKeywordOptimization(review.id);
    setOptimization(null);
    setPreviewOpen(false);
  }, [review.id]);

  const handleBackToSuggestions = useCallback(() => {
    if (!optimization) return;
    const reverted = reopenAtsKeywordOptimizationForReview(
      review.id,
      optimization,
    );
    const patchedReview = patchResumeReviewAtsScore(
      review,
      reverted.originalATSScore,
    );
    saveResumeReview(patchedReview);
    setReview(patchedReview);
    setOptimization(reverted);
    setOptimizedPreviewOpen(false);
    setPreviewMode("review");
    setPreviewOpen(true);
  }, [optimization, review]);

  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <StickyScreenBody className={cn("py-4", atsOptimized && "pb-36")}>
        <div className="space-y-8">
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
            <h2 className={cn("px-4", FORM_FIELD_LABEL_CLASS)}>
              Category scores
            </h2>
            <div className="grid grid-cols-2 items-start gap-3 px-4">
              {review.categories.map((category, index) =>
                category.key === "ats" ? (
                  <ResumeReviewAtsCategoryCard
                    key={category.key}
                    category={category}
                    optimization={optimization}
                    onOptimizeKeywords={() => void runOptimization()}
                    onPreviewChanges={() => {
                      setPreviewMode("review");
                      setPreviewOpen(true);
                    }}
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
      </StickyScreenBody>

      {atsOptimized ? (
        <StickyBottomCta
          variant="floating"
          scrollFade
          scrollFadeClassName="h-[10.5rem]"
          inactive={loadingOpen}
        >
          <div className="space-y-2">
            <Button
              type="button"
              variant="outline"
              className={RESUME_REVIEW_PREVIEW_CTA_CLASS}
              onClick={openOptimizedPreview}
            >
              Preview optimized resume
            </Button>
            <Button
              type="button"
              className={RESUME_REVIEW_PRIMARY_CTA_CLASS}
              onClick={handleDownload}
              disabled={downloading}
            >
              {downloading ? "Preparing download…" : "Download Optimized Resume"}
            </Button>
          </div>
        </StickyBottomCta>
      ) : null}

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
      {optimization && isAtsOptimizationApplied(optimization) ? (
        <AtsOptimizedResumePreviewDrawer
          open={optimizedPreviewOpen}
          variant={optimizedPreviewVariant}
          onClose={() => setOptimizedPreviewOpen(false)}
          onBackToSuggestions={handleBackToSuggestions}
          optimization={optimization}
          onDownload={handleDownload}
          downloading={downloading}
        />
      ) : null}
    </div>
  );
}
