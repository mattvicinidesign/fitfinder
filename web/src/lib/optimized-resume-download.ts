"use client";

import type {
  OptimizedResumeExportResult,
  DownloadOptimizedResumeInput,
} from "@/lib/optimized-resume-export";

export type {
  OptimizedResumeExportResult,
  DownloadOptimizedResumeInput,
};

export {
  buildOptimizedResumeDownloadInput,
  downloadOptimizedResume,
} from "@/lib/optimized-resume-export";
export { showOptimizedResumeExportToast } from "@/lib/optimized-resume-export-toast";
