"use client";

import type { OptimizedResumeExportResult } from "@/lib/optimized-resume-export";
import { isNativePlatform } from "@/lib/platform";

export function showOptimizedResumeExportToast(
  result: OptimizedResumeExportResult,
): void {
  void import("sonner").then(({ toast }) => {
    if (!result.layoutPreserved) {
      toast.success(
        isNativePlatform()
          ? "Exported with keyword changes (layout was rebuilt for compatibility)."
          : "Resume downloaded with keyword changes (layout edits skipped).",
      );
      return;
    }

    if (!result.typographyPreserved) {
      toast.info(
        "Some keyword swaps were skipped to preserve visual formatting.",
      );
      return;
    }

    toast.success(
      isNativePlatform()
        ? "Choose where to save your resume."
        : "Optimized resume downloaded.",
    );
  });
}
