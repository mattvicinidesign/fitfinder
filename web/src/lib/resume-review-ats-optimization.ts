"use client";

import type { AtsKeywordChangeDecision, AtsKeywordOptimization } from "@/lib/types";
import {
  ATS_NO_KEYWORDS_MESSAGE,
  ATS_PREVIEW_KEYWORD_CHANGE_COUNT,
  ATS_OPTIMIZE_CONFIRM_EXAMPLES,
  buildAtsOptimizationScanResult,
  buildOptimizedResumeText,
  buildPhraseBoundaryPattern,
  classifyAtsSafetyScore,
  computeOptimizedAtsScore,
  occurrenceIndexForChange,
  validateReplacementIntegrity,
} from "@/lib/ats-keyword-optimization-core";
import { logAtsApplyStats } from "@/lib/ats-discovery-stats";
import {
  clearReplacementAudit,
  logReplacementAudit,
} from "@/lib/ats-optimizer-debug";
import { getCachedResumeText, resolveResumeIdForOptimization, resolveResumeTextForOptimization } from "@/lib/resume-parse-tracker";

const CACHE_PREFIX = "fitfinder:resume-review:ats-optimization:";
/** Bump when cached optimization shape / apply logic changes — clears stale sessionStorage. */
const ATS_OPTIMIZATION_CACHE_VERSION = 3;
const ATS_CACHE_VERSION_KEY = "fitfinder:ats-optimization-cache-version";

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
    layoutPreservationScore:
      typeof record.layoutPreservationScore === "number"
        ? record.layoutPreservationScore
        : undefined,
    layoutReverted: record.layoutReverted === true,
    typographyPreservationScore:
      typeof record.typographyPreservationScore === "number"
        ? record.typographyPreservationScore
        : undefined,
    typographyReverted: record.typographyReverted === true,
    appliedKeywordChanges: Array.isArray(record.appliedKeywordChanges)
      ? (record.appliedKeywordChanges as AtsKeywordOptimization["keywordChanges"])
      : undefined,
    keywordOpportunitiesFound:
      typeof record.keywordOpportunitiesFound === "number"
        ? record.keywordOpportunitiesFound
        : undefined,
    discoveryRejectionCounts:
      record.discoveryRejectionCounts &&
      typeof record.discoveryRejectionCounts === "object"
        ? (record.discoveryRejectionCounts as AtsKeywordOptimization["discoveryRejectionCounts"])
        : undefined,
    reviewRejectionCounts:
      record.reviewRejectionCounts &&
      typeof record.reviewRejectionCounts === "object"
        ? (record.reviewRejectionCounts as AtsKeywordOptimization["reviewRejectionCounts"])
        : undefined,
    rejectedCandidates: Array.isArray(record.rejectedCandidates)
      ? (record.rejectedCandidates as AtsKeywordOptimization["rejectedCandidates"])
      : undefined,
    atsDiagnostics:
      record.atsDiagnostics && typeof record.atsDiagnostics === "object"
        ? (record.atsDiagnostics as AtsKeywordOptimization["atsDiagnostics"])
        : undefined,
    reviewCandidates:
      typeof record.reviewCandidates === "number"
        ? record.reviewCandidates
        : undefined,
    applyRejectionCounts:
      record.applyRejectionCounts &&
      typeof record.applyRejectionCounts === "object"
        ? (record.applyRejectionCounts as AtsKeywordOptimization["applyRejectionCounts"])
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

export function getAppliedKeywordChangesForDisplay(
  optimization: AtsKeywordOptimization,
): AtsKeywordOptimization["keywordChanges"] {
  if (optimization.appliedKeywordChanges?.length) {
    return optimization.appliedKeywordChanges;
  }

  const preview = optimization.keywordChanges.slice(
    0,
    ATS_PREVIEW_KEYWORD_CHANGE_COUNT,
  );
  const decisions = optimization.keywordChangeDecisions ?? [];
  return preview.filter((_, index) => decisions[index] === "approved");
}

function cacheKey(reviewId: string) {
  return `${CACHE_PREFIX}${reviewId}`;
}

function isStaleAtsOptimization(optimization: AtsKeywordOptimization): boolean {
  if (optimization.keywordChanges.length === 0) return false;
  return optimization.keywordChanges.some(
    (change) =>
      typeof change.lineIndex !== "number" ||
      typeof change.matchIndex !== "number",
  );
}

function isBrokenAppliedOptimization(
  optimization: AtsKeywordOptimization,
): boolean {
  if (!optimization.optimizationApplied) return false;
  const approvedCount = (optimization.keywordChangeDecisions ?? []).filter(
    (decision) => decision === "approved",
  ).length;
  const appliedCount = optimization.appliedKeywordChanges?.length ?? 0;
  return approvedCount > 0 && appliedCount === 0;
}

/** Drop ATS optimization sessionStorage from older builds (missing line targets, failed apply). */
export function ensureAtsOptimizationCacheFresh(): void {
  if (typeof sessionStorage === "undefined") return;

  const storedVersion = sessionStorage.getItem(ATS_CACHE_VERSION_KEY);
  if (storedVersion !== String(ATS_OPTIMIZATION_CACHE_VERSION)) {
    clearAllAtsKeywordOptimizations();
    sessionStorage.setItem(
      ATS_CACHE_VERSION_KEY,
      String(ATS_OPTIMIZATION_CACHE_VERSION),
    );
    return;
  }

  for (let i = sessionStorage.length - 1; i >= 0; i -= 1) {
    const key = sessionStorage.key(i);
    if (!key?.startsWith(CACHE_PREFIX)) continue;
    try {
      const raw = sessionStorage.getItem(key);
      if (!raw) continue;
      const parsed = normalizeAtsKeywordOptimization(JSON.parse(raw));
      if (
        !parsed ||
        isStaleAtsOptimization(parsed) ||
        isBrokenAppliedOptimization(parsed)
      ) {
        sessionStorage.removeItem(key);
      }
    } catch {
      sessionStorage.removeItem(key);
    }
  }
}

export function loadAtsKeywordOptimization(
  reviewId: string | null | undefined,
): AtsKeywordOptimization | null {
  if (!reviewId || typeof sessionStorage === "undefined") return null;
  ensureAtsOptimizationCacheFresh();
  const raw = sessionStorage.getItem(cacheKey(reviewId));
  if (!raw) return null;
  try {
    const parsed = normalizeAtsKeywordOptimization(JSON.parse(raw));
    if (
      !parsed ||
      isStaleAtsOptimization(parsed) ||
      isBrokenAppliedOptimization(parsed)
    ) {
      sessionStorage.removeItem(cacheKey(reviewId));
      return null;
    }
    return parsed;
  } catch {
    sessionStorage.removeItem(cacheKey(reviewId));
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
  layoutPreservationScore: number;
  typographyPreservationScore: number;
  layoutReverted: boolean;
  typographyReverted: boolean;
  appliedChanges: AtsKeywordOptimization["keywordChanges"];
  applyRejectionCounts: AtsKeywordOptimization["applyRejectionCounts"];
} {
  const previewChanges = optimization.keywordChanges.slice(
    0,
    ATS_PREVIEW_KEYWORD_CHANGE_COUNT,
  );
  const approvedIndices = previewChanges.flatMap((_, index) =>
    decisions[index] === "approved" ? [index] : [],
  );

  const built = buildOptimizedResumeText(
    optimization.originalResumeText,
    previewChanges,
    approvedIndices,
  );

  clearReplacementAudit();
  for (const change of built.appliedChanges) {
    const pattern = buildPhraseBoundaryPattern(change.before, "i");
    const originalLine =
      optimization.originalResumeText
        .split("\n")
        .find((line) => pattern.test(line)) ?? "";
    const resultingLine =
      built.optimizedResumeText
        .split("\n")
        .find((line) =>
          buildPhraseBoundaryPattern(change.after, "i").test(line),
        ) ?? originalLine;
    const integrity = validateReplacementIntegrity(
      originalLine,
      resultingLine,
      change,
    );
    logReplacementAudit({
      stage: "text_apply",
      replacement: `${change.before} → ${change.after}`,
      originalSentence: originalLine,
      resultingSentence: resultingLine,
      finalRenderedSentence: resultingLine,
      integrityPassed: integrity.passed,
      failures: integrity.failures,
    });
  }

  const appliedCount = built.appliedChanges.length;
  const { optimizedATSScore, improvementPercentage } = computeOptimizedAtsScore(
    optimization.originalATSScore,
    appliedCount,
    previewChanges.length,
  );

  return {
    optimizedResumeText: built.optimizedResumeText,
    optimizedATSScore,
    improvementPercentage,
    approvedChanges: approvedIndices.map((index) => previewChanges[index]!),
    layoutPreservationScore: built.layoutPreservationScore,
    typographyPreservationScore: built.typographyPreservationScore,
    layoutReverted: built.reverted,
    typographyReverted: built.reverted,
    appliedChanges: built.appliedChanges,
    applyRejectionCounts: built.applyRejectionCounts,
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

  const resumeId = await resolveResumeIdForOptimization(input.resumeId);
  const resumeText =
    input.resumeText?.trim() ||
    (resumeId
      ? (getCachedResumeText(resumeId) ??
        (await resolveResumeTextForOptimization(resumeId)))
      : null);

  if (!resumeId) {
    throw new Error(
      "Could not find your resume file. Tap Replace and upload the resume again.",
    );
  }

  if (!resumeText) {
    throw new Error(
      "Could not read your resume text. Tap Replace and upload the resume again.",
    );
  }

  const scan = buildAtsOptimizationScanResult(
    resumeText,
    input.originalATSScore,
  );
  if (scan.keywordOpportunitiesFound === 0) {
    throw new Error(ATS_NO_KEYWORDS_MESSAGE);
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
  const approvedCount = decisions.filter((d) => d === "approved").length;

  if (approvedCount > 0 && built.appliedChanges.length === 0) {
    throw new Error(
      "None of the approved keyword swaps could be applied. Try re-running optimization.",
    );
  }

  const next: AtsKeywordOptimization = {
    ...optimization,
    optimizedResumeText: built.optimizedResumeText,
    optimizedATSScore: built.optimizedATSScore,
    improvementPercentage: built.improvementPercentage,
    totalKeywordEdits: built.appliedChanges.length,
    atsSafetyScore: classifyAtsSafetyScore(built.appliedChanges.length),
    keywordChangeDecisions: decisions.slice(0, ATS_PREVIEW_KEYWORD_CHANGE_COUNT),
    layoutPreservationScore: built.layoutPreservationScore,
    layoutReverted: built.layoutReverted,
    typographyPreservationScore: built.typographyPreservationScore,
    typographyReverted: built.typographyReverted,
    appliedKeywordChanges: built.appliedChanges,
    applyRejectionCounts: built.applyRejectionCounts,
    atsDiagnostics: optimization.atsDiagnostics
      ? {
          ...optimization.atsDiagnostics,
          approvedCandidates: built.appliedChanges.length,
        }
      : {
          opportunitiesFound:
            optimization.keywordOpportunitiesFound ??
            optimization.keywordChanges.length,
          reviewCandidates: optimization.keywordChanges.length,
          approvedCandidates: built.appliedChanges.length,
          rejected: built.applyRejectionCounts ?? {
            width_tolerance: 0,
            typography: 0,
            duplicate_keyword_limit: 0,
            saturation_limit: 0,
            layout_preservation: 0,
            length_ratio: 0,
            golden_rule: 0,
            buzzword: 0,
          },
        },
    optimizationApplied: true,
    completedAt: new Date().toISOString(),
  };
  saveAtsKeywordOptimization(reviewId, next);
  logAtsApplyStats(next);
  return next;
}

/**
 * Undo an applied optimization so the user can revisit Suggested Changes
 * and change approvals. Keeps prior keyword decisions.
 */
export function reopenAtsKeywordOptimizationForReview(
  reviewId: string,
  optimization: AtsKeywordOptimization,
): AtsKeywordOptimization {
  const next: AtsKeywordOptimization = {
    ...optimization,
    optimizationApplied: false,
    optimizedResumeText: optimization.originalResumeText,
    optimizedATSScore: optimization.originalATSScore,
    improvementPercentage: 0,
    appliedKeywordChanges: undefined,
    layoutReverted: false,
    typographyReverted: false,
    applyRejectionCounts: undefined,
  };
  saveAtsKeywordOptimization(reviewId, next);
  return next;
}

export {
  downloadOptimizedResume,
  buildOptimizedResumeDownloadInput,
  showOptimizedResumeExportToast,
} from "@/lib/optimized-resume-download";

export async function downloadAppliedAtsOptimization(input: {
  optimization: AtsKeywordOptimization;
  sourceFileName: string;
  resumeId?: string | null;
}): Promise<void> {
  const {
    downloadOptimizedResume,
    buildOptimizedResumeDownloadInput,
    showOptimizedResumeExportToast,
  } = await import("@/lib/optimized-resume-download");
  const { toast } = await import("sonner");

  if (input.optimization.layoutReverted) {
    toast.info(
      "Exported your original resume — changes could not be applied safely.",
    );
    return;
  }

  if ((input.optimization.appliedKeywordChanges?.length ?? 0) === 0) {
    toast.warning("No keyword changes could be applied to your file.");
    return;
  }

  try {
    const result = await downloadOptimizedResume(
      buildOptimizedResumeDownloadInput(
        input.optimization,
        input.sourceFileName,
        input.resumeId,
      ),
    );
    showOptimizedResumeExportToast(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not export the resume.";
    toast.error(message);
    throw error;
  }
}

export function dismissAtsImprovementBadge(
  reviewId: string,
  optimization: AtsKeywordOptimization,
): AtsKeywordOptimization {
  const next = { ...optimization, improvementDismissed: true };
  saveAtsKeywordOptimization(reviewId, next);
  return next;
}
