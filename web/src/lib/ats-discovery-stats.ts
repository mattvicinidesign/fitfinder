import type { AtsKeywordOptimization } from "@/lib/types";
import type { KeywordRejectionCounts } from "@/lib/ats-keyword-optimization-core";

function sumRejections(counts: KeywordRejectionCounts | undefined): number {
  if (!counts) return 0;
  return Object.values(counts).reduce((sum, value) => sum + value, 0);
}

export function formatKeywordRejectionSummary(
  counts: KeywordRejectionCounts | undefined,
): string | null {
  if (!counts) return null;

  const parts: string[] = [];
  if (counts.width_tolerance > 0) {
    parts.push(`Width ${counts.width_tolerance}`);
  }
  if (counts.golden_rule > 0) {
    parts.push(`Golden rule ${counts.golden_rule}`);
  }
  if (counts.typography > 0) {
    parts.push(`Typography ${counts.typography}`);
  }
  if (counts.layout_preservation > 0) {
    parts.push(`Layout ${counts.layout_preservation}`);
  }
  if (counts.saturation_limit > 0) {
    parts.push(`Saturation ${counts.saturation_limit}`);
  }
  if (counts.duplicate_keyword_limit > 0) {
    parts.push(`Duplicate ${counts.duplicate_keyword_limit}`);
  }
  if (counts.length_ratio > 0) {
    parts.push(`Length ${counts.length_ratio}`);
  }
  if (counts.buzzword > 0) {
    parts.push(`Buzzword ${counts.buzzword}`);
  }

  return parts.length > 0 ? parts.join(" · ") : null;
}

export function formatRejectionReasonLabel(
  reason: NonNullable<AtsKeywordOptimization["rejectedCandidates"]>[number]["reason"],
): string {
  switch (reason) {
    case "width_tolerance":
      return "Width";
    case "golden_rule":
      return "Golden rule";
    case "typography":
      return "Typography";
    case "layout_preservation":
      return "Layout";
    case "saturation_limit":
      return "Saturation";
    case "duplicate_keyword_limit":
      return "Duplicate";
    case "length_ratio":
      return "Length";
    default:
      return "Buzzword";
  }
}

export function getAtsDiscoverySummary(optimization: AtsKeywordOptimization): {
  found: number;
  readyToReview: number;
  applied: number;
  rejected: number;
  discoveryRejectionSummary: string | null;
  reviewRejectionSummary: string | null;
  applyRejectionSummary: string | null;
} {
  const found =
    optimization.atsDiagnostics?.opportunitiesFound ??
    optimization.keywordOpportunitiesFound ??
    optimization.keywordChanges.length;
  const readyToReview =
    optimization.reviewCandidates ??
    optimization.atsDiagnostics?.reviewCandidates ??
    optimization.keywordChanges.length;
  const applied =
    optimization.atsDiagnostics?.approvedCandidates ??
    optimization.appliedKeywordChanges?.length ??
    0;
  const reviewRejected = sumRejections(optimization.reviewRejectionCounts);
  const discoveryRejected = sumRejections(optimization.discoveryRejectionCounts);
  const rejected = optimization.optimizationApplied
    ? Math.max(0, found - applied)
    : reviewRejected + discoveryRejected ||
      Math.max(0, found - readyToReview);

  return {
    found,
    readyToReview,
    applied: optimization.optimizationApplied ? applied : 0,
    rejected,
    discoveryRejectionSummary: formatKeywordRejectionSummary(
      optimization.discoveryRejectionCounts,
    ),
    reviewRejectionSummary: formatKeywordRejectionSummary(
      optimization.reviewRejectionCounts,
    ),
    applyRejectionSummary: formatKeywordRejectionSummary(
      optimization.applyRejectionCounts,
    ),
  };
}

export function logAtsApplyStats(optimization: AtsKeywordOptimization): void {
  const summary = getAtsDiscoverySummary(optimization);
  console.info(
    `[ATS apply] Found: ${summary.found} | Review: ${summary.readyToReview} | Applied: ${summary.applied} | ` +
      `Rejected: ${summary.rejected}` +
      (summary.applyRejectionSummary
        ? ` | ${summary.applyRejectionSummary}`
        : ""),
  );
}
