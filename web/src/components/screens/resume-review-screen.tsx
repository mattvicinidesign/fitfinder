"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { IosLargeTitle } from "@/components/ui/ios-large-title";
import { screenShellClass } from "@/components/ui/sticky-bottom-cta";
import { ResumeReviewIntro } from "@/components/resume-review-intro";
import { ResumeReviewResultView } from "@/components/resume-review-result";
import { ResumeReviewUploadZone } from "@/components/resume-review-upload-zone";
import { reviewResume } from "@/lib/api";
import { fetchLatestUserResume } from "@/lib/resume-documents";
import {
  getCachedParsedResume,
  resolveResumeIdForOptimization,
  resolveResumeTextForOptimization,
  waitForResumeParse,
} from "@/lib/resume-parse-tracker";
import {
  clearResumeReview,
  loadResumeReview,
  loadResumeReviewFileName,
  loadResumeReviewResumeId,
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
  const [bootstrapping, setBootstrapping] = useState(true);
  const [animateGauge, setAnimateGauge] = useState(false);
  const runReviewRef = useRef<
    (resumeId: string, name: string) => Promise<void>
  >(() => Promise.resolve());

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

  runReviewRef.current = runReview;

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      ensureAtsOptimizationCacheFresh();
      const cached = loadResumeReview();
      const cachedResumeId =
        loadResumeReviewResumeId() ?? cached?.resumeId ?? null;

      let latest: Awaited<ReturnType<typeof fetchLatestUserResume>> = null;
      try {
        latest = await fetchLatestUserResume();
      } catch {
        latest = null;
      }

      if (cancelled) return;

      const latestId = latest?.id ?? null;
      const shouldUseCache =
        cached != null &&
        (!latestId || !cachedResumeId || cachedResumeId === latestId);

      if (shouldUseCache) {
        setReview(cached);
        setFileName(loadResumeReviewFileName());
        void resolveResumeIdForOptimization(cached.resumeId).then((resumeId) => {
          if (resumeId && !cancelled) {
            void resolveResumeTextForOptimization(resumeId);
          }
        });
        return;
      }

      if (!latest) return;

      try {
        await waitForResumeParse(latest.id);
      } catch {
        // Parse may already be cached from signup or profile upload.
      }

      if (cancelled) return;
      await runReviewRef.current(latest.id, latest.fileName);
    }

    setBootstrapping(true);
    void bootstrap()
      .catch(() => {
        // Errors surface from runReview; keep empty state on bootstrap failure.
      })
      .finally(() => {
        if (!cancelled) setBootstrapping(false);
      });

    return () => {
      cancelled = true;
    };
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

      {bootstrapping || reviewing ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-4 py-16 text-center">
          <Loader2 className="size-10 animate-spin text-primary" aria-hidden />
          <p className="text-[17px] font-medium text-foreground">
            {bootstrapping && !reviewing
              ? "Loading your resume…"
              : "Analyzing your resume…"}
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
