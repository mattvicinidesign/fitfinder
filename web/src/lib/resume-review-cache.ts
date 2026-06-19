import type { ResumeReviewResult } from "@/lib/types";
import { patchResumeReviewAtsScore } from "@/lib/patch-resume-review-ats-score";
import {
  isAtsOptimizationApplied,
  loadAtsKeywordOptimization,
  clearAllAtsKeywordOptimizations,
} from "@/lib/resume-review-ats-optimization";
import { normalizeResumeReviewScores } from "@/lib/resume-review-scores";

const CACHE_KEY = "fitfinder:resume-review:last";
const FILE_NAME_KEY = "fitfinder:resume-review:last-filename";

export function saveResumeReview(review: ResumeReviewResult): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(
    CACHE_KEY,
    JSON.stringify(normalizeResumeReviewScores(review)),
  );
}

export function loadResumeReview(): ResumeReviewResult | null {
  if (typeof sessionStorage === "undefined") return null;
  const raw = sessionStorage.getItem(CACHE_KEY);
  if (!raw) return null;
  try {
    let review = normalizeResumeReviewScores(JSON.parse(raw) as ResumeReviewResult);
    const optimization = loadAtsKeywordOptimization(review.id);
    if (optimization && isAtsOptimizationApplied(optimization)) {
      review = patchResumeReviewAtsScore(review, optimization.optimizedATSScore);
    }
    return review;
  } catch {
    return null;
  }
}

export function saveResumeReviewFileName(fileName: string): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(FILE_NAME_KEY, fileName);
}

export function loadResumeReviewFileName(): string | null {
  if (typeof sessionStorage === "undefined") return null;
  return sessionStorage.getItem(FILE_NAME_KEY);
}

export function clearResumeReview(): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(CACHE_KEY);
  sessionStorage.removeItem(FILE_NAME_KEY);
  clearAllAtsKeywordOptimizations();
}
