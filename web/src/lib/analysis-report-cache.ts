import type { AnalysisResult, Compensation } from "@/lib/types";

export type AnalysisReportCacheEntry = {
  result: AnalysisResult;
  analysisId: string | null;
  profileDesiredCompensation?: Compensation | null;
  profileQualifiedIndustries?: string[] | null;
  profileCountry?: string | null;
  profileTimezone?: string | null;
};

const STORAGE_PREFIX = "fitfinder:analysis-report:";

export function saveAnalysisReport(
  reportId: string,
  entry: AnalysisReportCacheEntry,
): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(
    `${STORAGE_PREFIX}${reportId}`,
    JSON.stringify(entry),
  );
}

export function loadAnalysisReport(
  reportId: string,
): AnalysisReportCacheEntry | null {
  if (typeof sessionStorage === "undefined") return null;
  const raw = sessionStorage.getItem(`${STORAGE_PREFIX}${reportId}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AnalysisReportCacheEntry;
  } catch {
    return null;
  }
}

export function clearAnalysisReport(reportId: string): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(`${STORAGE_PREFIX}${reportId}`);
}
