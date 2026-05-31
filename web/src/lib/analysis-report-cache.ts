import type { AnalysisResult, Compensation } from "@/lib/types";
import { recordRecentActivityFromReport } from "@/lib/recent-activity";

export type AnalysisReportCacheEntry = {
  result: AnalysisResult;
  analysisId: string | null;
  profileDesiredCompensation?: Compensation | null;
  profileQualifiedIndustries?: string[] | null;
  profileCountry?: string | null;
  profileTimezone?: string | null;
};

const STORAGE_PREFIX = "fitfinder:analysis-report:";
const LAST_REPORT_ID_KEY = "fitfinder:last-analysis-report-id";

export function saveAnalysisReport(
  reportId: string,
  entry: AnalysisReportCacheEntry,
): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(
    `${STORAGE_PREFIX}${reportId}`,
    JSON.stringify(entry),
  );
  sessionStorage.setItem(LAST_REPORT_ID_KEY, reportId);
  recordRecentActivityFromReport(reportId, entry);
}

export function reportRoleTitle(result: AnalysisResult): string {
  return (
    result.jobTitle?.trim() ||
    result.parsedJob.roleTitle?.trim() ||
    "Job"
  );
}

export function getLastAnalysisReport(): {
  reportId: string;
  roleTitle: string;
} | null {
  const reportId = getLastAnalysisReportId();
  if (!reportId) return null;
  const entry = loadAnalysisReport(reportId);
  if (!entry) return null;
  return { reportId, roleTitle: reportRoleTitle(entry.result) };
}

export function getLastAnalysisReportId(): string | null {
  if (typeof sessionStorage === "undefined") return null;
  const reportId = sessionStorage.getItem(LAST_REPORT_ID_KEY);
  if (!reportId) return null;
  return loadAnalysisReport(reportId) ? reportId : null;
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
