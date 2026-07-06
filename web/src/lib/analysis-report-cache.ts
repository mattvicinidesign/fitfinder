import type { AnalysisResult, Compensation } from "@/lib/types";
import { resolveJobTitle } from "@/lib/posting-details";
import { recordRecentActivityFromReport } from "@/lib/recent-activity";

export type AnalysisReportCacheEntry = {
  result: AnalysisResult;
  analysisId: string | null;
  resumeId?: string | null;
  profileDesiredCompensation?: Compensation | null;
  profileQualifiedIndustries?: string[] | null;
  profileQualifiedSkills?: string[] | null;
  profileCountry?: string | null;
  profileTimezone?: string | null;
  profilePreferredCompanyTypes?: string[] | null;
  profilePreferredMinimumEmployerRating?: number | null;
  profilePreferredRegions?: string[] | null;
  profilePreferredProjectTypes?: string[] | null;
  profileMinimumHourlyRate?: number | null;
};

const STORAGE_PREFIX = "fitfinder:analysis-report:";
const LAST_REPORT_ID_KEY = "fitfinder:last-analysis-report-id";
const SAMPLE_REPORT_ID_PREFIX = "sample-analysis-";

function isSampleReportStorageId(reportId: string): boolean {
  return reportId.startsWith(SAMPLE_REPORT_ID_PREFIX);
}

function reportStorageKey(reportId: string): string {
  return `${STORAGE_PREFIX}${reportId}`;
}

function parseReportEntry(raw: string | null): AnalysisReportCacheEntry | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AnalysisReportCacheEntry;
  } catch {
    return null;
  }
}

function readReportFromStorage(
  storage: Storage | undefined,
  reportId: string,
): AnalysisReportCacheEntry | null {
  if (!storage) return null;
  return parseReportEntry(storage.getItem(reportStorageKey(reportId)));
}

function writeReportToStorage(
  storage: Storage | undefined,
  reportId: string,
  payload: string,
  options?: { updateLastReportId?: boolean },
): void {
  if (!storage) return;
  storage.setItem(reportStorageKey(reportId), payload);
  if (options?.updateLastReportId !== false) {
    storage.setItem(LAST_REPORT_ID_KEY, reportId);
  }
}

function warmSessionReportCache(
  reportId: string,
  entry: AnalysisReportCacheEntry,
): void {
  if (typeof sessionStorage === "undefined") return;
  if (readReportFromStorage(sessionStorage, reportId)) return;
  writeReportToStorage(sessionStorage, reportId, JSON.stringify(entry), {
    updateLastReportId: false,
  });
}

export function saveAnalysisReport(
  reportId: string,
  entry: AnalysisReportCacheEntry,
  options?: { trackRecentActivity?: boolean },
): void {
  const payload = JSON.stringify(entry);
  const updateLastReportId = options?.trackRecentActivity !== false;
  writeReportToStorage(sessionStorage, reportId, payload, { updateLastReportId });
  writeReportToStorage(localStorage, reportId, payload, { updateLastReportId });

  if (options?.trackRecentActivity !== false) {
    recordRecentActivityFromReport(reportId, entry);
  }
}

export function reportRoleTitle(result: AnalysisResult): string {
  return (
    resolveJobTitle(
      result.jobTitle,
      result.jobDescription,
      result.parsedJob.roleTitle,
    ) ?? "Job"
  );
}

export function getLastAnalysisReport(): {
  reportId: string;
  roleTitle: string;
} | null {
  const reportId = getLastAnalysisReportId();
  if (!reportId || isSampleReportStorageId(reportId)) return null;
  const entry = loadAnalysisReport(reportId);
  if (!entry) return null;
  return { reportId, roleTitle: reportRoleTitle(entry.result) };
}

function clearSampleLastReportPointer(storage: Storage | undefined): void {
  if (!storage) return;
  const reportId = storage.getItem(LAST_REPORT_ID_KEY);
  if (reportId && isSampleReportStorageId(reportId)) {
    storage.removeItem(LAST_REPORT_ID_KEY);
  }
}

/** Remove sample-report pointers left by older builds that seeded fixtures. */
export function repairSampleLastAnalysisReportPointer(): void {
  clearSampleLastReportPointer(sessionStorage);
  clearSampleLastReportPointer(localStorage);
}

export function getLastAnalysisReportId(): string | null {
  const fromSession =
    typeof sessionStorage !== "undefined"
      ? sessionStorage.getItem(LAST_REPORT_ID_KEY)
      : null;
  if (fromSession && !isSampleReportStorageId(fromSession) && loadAnalysisReport(fromSession)) {
    return fromSession;
  }

  const fromLocal =
    typeof localStorage !== "undefined"
      ? localStorage.getItem(LAST_REPORT_ID_KEY)
      : null;
  if (fromLocal && !isSampleReportStorageId(fromLocal) && loadAnalysisReport(fromLocal)) {
    return fromLocal;
  }

  return null;
}

/** Session cache first; fall back to localStorage so iOS cold starts keep reports. */
export function loadAnalysisReport(
  reportId: string,
): AnalysisReportCacheEntry | null {
  const fromSession = readReportFromStorage(sessionStorage, reportId);
  if (fromSession) return fromSession;

  const fromLocal = readReportFromStorage(localStorage, reportId);
  if (fromLocal) {
    warmSessionReportCache(reportId, fromLocal);
    return fromLocal;
  }

  return null;
}

export function clearAnalysisReport(reportId: string): void {
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem(reportStorageKey(reportId));
  }
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem(reportStorageKey(reportId));
  }
}
