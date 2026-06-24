"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { IosLargeTitle } from "@/components/ui/ios-large-title";
import { screenShellClass } from "@/components/ui/sticky-bottom-cta";
import { ResumeReviewIntro } from "@/components/resume-review-intro";
import { ResumeReviewResultView } from "@/components/resume-review-result";
import { ResumeReviewUploadZone } from "@/components/resume-review-upload-zone";
import { reviewResume } from "@/lib/api";
import { getCachedParsedResume, resolveResumeIdForOptimization, resolveResumeTextForOptimization } from "@/lib/resume-parse-tracker";
import {
  clearResumeReview,
  loadResumeReview,
  loadResumeReviewFileName,
  saveResumeReview,
  saveResumeReviewFileName,
} from "@/lib/resume-review-cache";
import { clearAtsKeywordOptimization, ensureAtsOptimizationCacheFresh } from "@/lib/resume-review-ats-optimization";
import type { ResumeReviewResult } from "@/lib/types";
import { toast } from "sonner";

export function ResumeReviewScreen() {
  const [review, setReview] = useState<ResumeReviewResult | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [animateGauge, setAnimateGauge] = useState(false);

  useEffect(() => {
    ensureAtsOptimizationCacheFresh();
    const cached = loadResumeReview();
    if (cached) {
      setReview(cached);
      setFileName(loadResumeReviewFileName());
      void resolveResumeIdForOptimization(cached.resumeId).then((resumeId) => {
        if (resumeId) void resolveResumeTextForOptimization(resumeId);
      });
    }
  }, []);

  const runReview = useCallback(async (resumeId: string, name: string) => {
    setReviewing(true);
    setFileName(name);
    try {
      const parsedResume = getCachedParsedResume(resumeId);
      const previous = loadResumeReview();
      if (previous?.id) {
        clearAtsKeywordOptimization(previous.id);
      }
      const result = await reviewResume({ resumeId, parsedResume });
      setAnimateGauge(true);
      setReview(result);
      saveResumeReview(result, resumeId);
      saveResumeReviewFileName(name);
      void resolveResumeTextForOptimization(resumeId);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Could not review this resume.",
      );
      setFileName(null);
    } finally {
      setReviewing(false);
    }
  }, []);

  const handleReplace = () => {
    clearResumeReview();
    setReview(null);
    setFileName(null);
    setAnimateGauge(false);
  };

  return (
    <div className={screenShellClass}>
      <IosLargeTitle
        title="Score"
        trailing={
          review ? (
            <button
              type="button"
              onClick={handleReplace}
              className="rounded-lg border border-border/80 bg-card px-3 py-1.5 text-[13px] font-medium text-foreground transition-colors hover:bg-muted/40"
            >
              Replace
            </button>
          ) : undefined
        }
      />

      {reviewing ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-4 py-16 text-center">
          <Loader2 className="size-10 animate-spin text-primary" aria-hidden />
          <p className="text-[17px] font-medium text-foreground">
            Analyzing your resume…
          </p>
          <p className="max-w-[16rem] text-[14px] text-muted-foreground">
            Checking content, structure, ATS compatibility, and completeness.
          </p>
        </div>
      ) : review ? (
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain touch-pan-y py-4">
          <ResumeReviewResultView
            review={review}
            fileName={fileName}
            animateGauge={animateGauge}
            onGaugeAnimationComplete={() => setAnimateGauge(false)}
          />
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-x-visible overflow-y-auto overscroll-contain touch-pan-y px-4 pb-4 pt-1">
          <ResumeReviewIntro />
          <ResumeReviewUploadZone
            pinnedBottom
            className="!px-0"
            onReady={({ resumeId, fileName: name }) => {
              void runReview(resumeId, name);
            }}
          />
        </div>
      )}
    </div>
  );
}
