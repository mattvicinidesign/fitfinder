"use client";

import type { AtsKeywordChangeDecision, AtsKeywordOptimization } from "@/lib/types";
import {
  ATS_NO_KEYWORDS_MESSAGE,
  ATS_PREVIEW_KEYWORD_CHANGE_COUNT,
  ATS_OPTIMIZE_CONFIRM_EXAMPLES,
  buildAtsOptimizationScanResult,
  buildOptimizedResumeText,
  classifyAtsSafetyScore,
  computeOptimizedAtsScore,
  occurrenceIndexForChange,
} from "@/lib/ats-keyword-optimization-core";
import { optimizeAtsKeywords } from "@/lib/api";
import { getCachedResumeText } from "@/lib/resume-parse-tracker";

const CACHE_PREFIX = "fitfinder:resume-review:ats-optimization:";

export { ATS_PREVIEW_KEYWORD_CHANGE_COUNT, ATS_OPTIMIZE_CONFIRM_EXAMPLES };

export const ATS_OPTIMIZE_LOADING_STEPS = [
  "Analyzing Resume",
  "Identifying Weak Keywords",
  "Applying ATS Enhancements",
  "Preparing Preview",
] as const;

function normalizeAtsKeywordOptimization(
  raw: unknown,
): AtsKeywordOptimization | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  if (typeof record.originalATSScore !== "number") return null;

  const legacyCompleted = record.optimizationCompleted === true;
  const scanCompleted =
    record.scanCompleted === true || legacyCompleted;
  const optimizationApplied =
    record.optimizationApplied === true || legacyCompleted;

  if (!scanCompleted) return null;

  return {
    originalATSScore: record.originalATSScore as number,
    optimizedATSScore: record.optimizedATSScore as number,
    improvementPercentage: record.improvementPercentage as number,
    scanCompleted: true,
    optimizationApplied,
    optimizedResumeText: String(record.optimizedResumeText ?? ""),
    originalResumeText: String(record.originalResumeText ?? ""),
    keywordChanges: Array.isArray(record.keywordChanges)
      ? (record.keywordChanges as AtsKeywordOptimization["keywordChanges"])
      : [],
    totalKeywordEdits:
      typeof record.totalKeywordEdits === "number"
        ? record.totalKeywordEdits
        : Array.isArray(record.keywordChanges)
          ? record.keywordChanges.length
          : 0,
    atsSafetyScore:
      record.atsSafetyScore === "low" ||
      record.atsSafetyScore === "medium" ||
      record.atsSafetyScore === "high"
        ? record.atsSafetyScore
        : undefined,
    modificationRatio:
      typeof record.modificationRatio === "number"
        ? record.modificationRatio
        : undefined,
    keywordChangeDecisions: Array.isArray(record.keywordChangeDecisions)
      ? (record.keywordChangeDecisions as AtsKeywordChangeDecision[])
      : undefined,
    completedAt: String(record.completedAt ?? new Date().toISOString()),
    improvementDismissed: record.improvementDismissed === true,
  };
}

export function isAtsOptimizationApplied(
  optimization: AtsKeywordOptimization | null | undefined,
): boolean {
  return optimization?.optimizationApplied === true;
}

export function isAtsScanPendingReview(
  optimization: AtsKeywordOptimization | null | undefined,
): boolean {
  return (
    optimization?.scanCompleted === true &&
    optimization.optimizationApplied !== true
  );
}

function cacheKey(reviewId: string) {
  return `${CACHE_PREFIX}${reviewId}`;
}

export function loadAtsKeywordOptimization(
  reviewId: string | null | undefined,
): AtsKeywordOptimization | null {
  if (!reviewId || typeof sessionStorage === "undefined") return null;
  const raw = sessionStorage.getItem(cacheKey(reviewId));
  if (!raw) return null;
  try {
    return normalizeAtsKeywordOptimization(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveAtsKeywordOptimization(
  reviewId: string,
  optimization: AtsKeywordOptimization,
): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(cacheKey(reviewId), JSON.stringify(optimization));
}

export function clearAtsKeywordOptimization(reviewId: string | null | undefined) {
  if (!reviewId || typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(cacheKey(reviewId));
}

export function clearAllAtsKeywordOptimizations(): void {
  if (typeof sessionStorage === "undefined") return;
  for (let i = sessionStorage.length - 1; i >= 0; i -= 1) {
    const key = sessionStorage.key(i);
    if (key?.startsWith(CACHE_PREFIX)) {
      sessionStorage.removeItem(key);
    }
  }
}

export function createPendingKeywordChangeDecisions(
  count = ATS_PREVIEW_KEYWORD_CHANGE_COUNT,
): AtsKeywordChangeDecision[] {
  return Array.from({ length: count }, () => "pending");
}

export function buildResumeWithApprovedChanges(
  optimization: AtsKeywordOptimization,
  decisions: AtsKeywordChangeDecision[],
): {
  optimizedResumeText: string;
  optimizedATSScore: number;
  improvementPercentage: number;
  approvedChanges: AtsKeywordOptimization["keywordChanges"];
} {
  const previewChanges = optimization.keywordChanges.slice(
    0,
    ATS_PREVIEW_KEYWORD_CHANGE_COUNT,
  );
  const approvedIndices = previewChanges.flatMap((_, index) =>
    decisions[index] === "approved" ? [index] : [],
  );

  const optimizedResumeText = buildOptimizedResumeText(
    optimization.originalResumeText,
    previewChanges,
    approvedIndices,
  );

  const approvedCount = approvedIndices.length;
  const { optimizedATSScore, improvementPercentage } = computeOptimizedAtsScore(
    optimization.originalATSScore,
    approvedCount,
    previewChanges.length,
  );

  return {
    optimizedResumeText,
    optimizedATSScore,
    improvementPercentage,
    approvedChanges: approvedIndices.map((index) => previewChanges[index]!),
  };
}

export function allKeywordChangesReviewed(
  decisions: AtsKeywordChangeDecision[],
  count = ATS_PREVIEW_KEYWORD_CHANGE_COUNT,
): boolean {
  return decisions.slice(0, count).every((decision) => decision !== "pending");
}

export function hasApprovedKeywordChanges(
  decisions: AtsKeywordChangeDecision[],
): boolean {
  return decisions.some((decision) => decision === "approved");
}

export function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export async function simulateAtsKeywordOptimization(input: {
  originalATSScore: number;
  resumeText?: string | null;
  resumeId?: string | null;
  onStep?: (stepIndex: number) => void;
}): Promise<AtsKeywordOptimization> {
  for (let i = 0; i < ATS_OPTIMIZE_LOADING_STEPS.length; i += 1) {
    input.onStep?.(i);
    await sleep(i === 0 ? 600 : 900);
  }

  const resumeText =
    input.resumeText?.trim() ||
    (input.resumeId ? getCachedResumeText(input.resumeId) : null);

  let scan: Omit<
    AtsKeywordOptimization,
    "keywordChangeDecisions" | "completedAt" | "improvementDismissed"
  >;

  try {
    scan = await optimizeAtsKeywords({
      resumeId: input.resumeId ?? undefined,
      resumeText: resumeText ?? undefined,
      originalATSScore: input.originalATSScore,
    });
  } catch (error) {
    if (!resumeText) throw error;
    const local = buildAtsOptimizationScanResult(
      resumeText,
      input.originalATSScore,
    );
    if (local.keywordChanges.length === 0) {
      throw new Error(ATS_NO_KEYWORDS_MESSAGE);
    }
    scan = local;
  }

  const previewCount = Math.min(
    scan.keywordChanges.length,
    ATS_PREVIEW_KEYWORD_CHANGE_COUNT,
  );

  return {
    ...scan,
    keywordChangeDecisions: createPendingKeywordChangeDecisions(previewCount),
    completedAt: new Date().toISOString(),
    improvementDismissed: false,
  };
}

export function applyAtsKeywordOptimization(
  reviewId: string,
  optimization: AtsKeywordOptimization,
  decisions: AtsKeywordChangeDecision[],
): AtsKeywordOptimization {
  const built = buildResumeWithApprovedChanges(optimization, decisions);
  const approvedCount = built.approvedChanges.length;
  const next: AtsKeywordOptimization = {
    ...optimization,
    optimizedResumeText: built.optimizedResumeText,
    optimizedATSScore: built.optimizedATSScore,
    improvementPercentage: built.improvementPercentage,
    totalKeywordEdits: approvedCount,
    atsSafetyScore: classifyAtsSafetyScore(approvedCount),
    keywordChangeDecisions: decisions.slice(0, ATS_PREVIEW_KEYWORD_CHANGE_COUNT),
    optimizationApplied: true,
    completedAt: new Date().toISOString(),
  };
  saveAtsKeywordOptimization(reviewId, next);
  return next;
}

export { downloadOptimizedResume } from "@/lib/optimized-resume-download";

export function dismissAtsImprovementBadge(
  reviewId: string,
  optimization: AtsKeywordOptimization,
): AtsKeywordOptimization {
  const next = { ...optimization, improvementDismissed: true };
  saveAtsKeywordOptimization(reviewId, next);
  return next;
}
