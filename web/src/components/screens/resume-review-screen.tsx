"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { IosLargeTitle } from "@/components/ui/ios-large-title";
import { screenShellClass } from "@/components/ui/sticky-bottom-cta";
import { ResumeReviewIntro } from "@/components/resume-review-intro";
import { ResumeReviewResultView } from "@/components/resume-review-result";
import {
  ResumeReviewUploadZone,
  type ResumeReviewUploadZoneHandle,
} from "@/components/resume-review-upload-zone";
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
import { recordRecentResumeScoreActivity } from "@/lib/recent-activity";
import { clearAtsKeywordOptimization, ensureAtsOptimizationCacheFresh } from "@/lib/resume-review-ats-optimization";
import type { ResumeReviewResult } from "@/lib/types";
import { REPLACE_RESUME_BUTTON_CLASS } from "@/components/resume-upload-styles";
import { toast } from "sonner";

function getInitialResumeReviewScreenState() {
  if (typeof window === "undefined") {
    return {
      review: null as ResumeReviewResult | null,
      fileName: null as string | null,
    };
  }

  ensureAtsOptimizationCacheFresh();
  const cached = loadResumeReview();
  if (!cached) {
    return { review: null, fileName: null };
  }

  return {
    review: cached,
    fileName: loadResumeReviewFileName(),
  };
}

export function ResumeReviewScreen() {
  const initial = getInitialResumeReviewScreenState();
  const [review, setReview] = useState<ResumeReviewResult | null>(initial.review);
  const [fileName, setFileName] = useState<string | null>(initial.fileName);
  const [pendingResumeId, setPendingResumeId] = useState<string | null>(null);
  const [pendingFileName, setPendingFileName] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [animateGauge, setAnimateGauge] = useState(false);
  const uploadZoneRef = useRef<ResumeReviewUploadZoneHandle>(null);

  const showReplaceButton =
    Boolean(review) || Boolean(pendingResumeId && pendingFileName);

  useEffect(() => {
    const cached = loadResumeReview();
    const cachedResumeId =
      loadResumeReviewResumeId() ?? cached?.resumeId ?? null;

    void (async () => {
      let latest: Awaited<ReturnType<typeof fetchLatestUserResume>> = null;
      try {
        latest = await fetchLatestUserResume();
      } catch {
        latest = null;
      }

      const latestId = latest?.id ?? null;
      const shouldUseCache =
        cached != null &&
        (!latestId || !cachedResumeId || cachedResumeId === latestId);

      if (shouldUseCache) {
        setReview(cached);
        setFileName(loadResumeReviewFileName());
        void resolveResumeIdForOptimization(cached.resumeId).then((resumeId) => {
          if (resumeId) void resolveResumeTextForOptimization(resumeId);
        });
        return;
      }

      setReview(null);
      setFileName(null);
      if (latest) {
        setPendingResumeId(latest.id);
        setPendingFileName(latest.fileName);
      }
    })();
  }, []);

  const runReview = useCallback(async (resumeId: string, name: string) => {
    setReviewing(true);
    setFileName(name);
    try {
      try {
        await waitForResumeParse(resumeId);
      } catch {
        // Parse may already be cached from signup or profile upload.
      }
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
      recordRecentResumeScoreActivity(result, name);
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
    void fetchLatestUserResume().then((latest) => {
      if (!latest) {
        setPendingResumeId(null);
        setPendingFileName(null);
        return;
      }
      setPendingResumeId(latest.id);
      setPendingFileName(latest.fileName);
    });
  };

  const handleScore = () => {
    if (!pendingResumeId || !pendingFileName) {
      toast.error("Upload your resume to continue.");
      return;
    }
    void runReview(pendingResumeId, pendingFileName);
  };

  function handleHeaderReplace() {
    if (review) {
      handleReplace();
      return;
    }
    uploadZoneRef.current?.openFilePicker();
  }

  return (
    <div className={screenShellClass}>
      <IosLargeTitle
        title="Score"
        trailing={
          showReplaceButton ? (
            <button
              type="button"
              onClick={handleHeaderReplace}
              className={REPLACE_RESUME_BUTTON_CLASS}
            >
              Replace Resume
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
        <ResumeReviewResultView
          review={review}
          fileName={fileName}
          animateGauge={animateGauge}
          onGaugeAnimationComplete={() => setAnimateGauge(false)}
        />
      ) : (
        <div className="min-h-0 flex-1 overflow-x-visible overflow-y-auto overscroll-contain touch-pan-y px-4 pb-4 pt-1">
          <ResumeReviewIntro />
          <ResumeReviewUploadZone
            ref={uploadZoneRef}
            pinnedBottom
            className="!px-0"
            resumeId={pendingResumeId}
            fileName={pendingFileName}
            onResumeChange={({ resumeId, fileName: name }) => {
              setPendingResumeId(resumeId);
              setPendingFileName(name);
            }}
            onScore={handleScore}
          />
        </div>
      )}
    </div>
  );
}
