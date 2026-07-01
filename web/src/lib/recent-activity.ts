import { formatRelativeTimeAgo } from "@/lib/posting-header-meta";
import { loadAnalysisReport } from "@/lib/analysis-report-cache";
import { normalizeAnalysisResult } from "@/lib/normalize-score";
import { clearQaEmptyActivityMark } from "@/lib/qa-activity";
import { reportHrefForReportId } from "@/lib/report-navigation";
import { resolveReportFitScoreFromCacheEntry } from "@/lib/report-display-score";
import { getResumeReviewMasterScore } from "@/lib/resume-review-scores";
import type { AnalysisRecord, Recommendation, ResumeReviewResult } from "@/lib/types";
import type { AnalysisReportCacheEntry } from "@/lib/analysis-report-cache";

export type RecentActivityKind = "fit_analysis" | "resume_score";

export type RecentActivityEntry = {
  kind?: RecentActivityKind;
  reportId: string;
  analysisId: string | null;
  job_title: string | null;
  company_name: string | null;
  fit_score: number | null;
  qualification_score: number | null;
  confidence_score: number | null;
  recommendation: Recommendation | null;
  recommendation_label: string | null;
  resume_score?: number | null;
  file_name?: string | null;
  created_at: string;
};

export type RecentActivityItem = AnalysisRecord & {
  /** Key in sessionStorage report cache (always use for report links). */
  report_id: string;
  activity_kind?: RecentActivityKind;
  resume_score?: number | null;
};

/** Home recent activity preview — full list lives on Stats. */
export const HOME_RECENT_ACTIVITY_DISPLAY_LIMIT = 10;

/** Stats "All Activity" lazy-load page size. */
export const ALL_ACTIVITY_PAGE_SIZE = 20;

export const ALL_ACTIVITY_SECTION_ID = "all-activity";

export const STATS_ALL_ACTIVITY_HREF = `/stats#${ALL_ACTIVITY_SECTION_ID}`;

const STORAGE_KEY = "fitfinder:recent-activity";
const MAX_STORED = 50;

function isSampleActivityReportId(reportId: string): boolean {
  return reportId.startsWith("sample-analysis-");
}

export function isResumeScoreActivity(
  item: Pick<RecentActivityItem, "activity_kind" | "report_id">,
): boolean {
  if (item.activity_kind === "resume_score") return true;
  return item.report_id?.startsWith("resume-review:") ?? false;
}

export function resumeReviewIdFromReportId(reportId: string): string | null {
  if (!reportId.startsWith("resume-review:")) return null;
  const id = reportId.slice("resume-review:".length).trim();
  return id || null;
}

export function recentActivityHref(
  item: Pick<RecentActivityItem, "activity_kind" | "report_id" | "id">,
  from = "/home",
): string {
  if (isResumeScoreActivity(item)) {
    const reviewId = resumeReviewIdFromReportId(item.report_id ?? "");
    return reviewId
      ? `/resume-review?reviewId=${encodeURIComponent(reviewId)}`
      : "/resume-review";
  }
  return reportHrefForReportId(item.report_id, from);
}

function readStored(): RecentActivityEntry[] {
  if (typeof localStorage === "undefined") return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as RecentActivityEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStored(entries: RecentActivityEntry[]): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_STORED)));
}

function normalizeCachedReportEntry(entry: AnalysisReportCacheEntry) {
  return normalizeAnalysisResult(entry.result, {
    profileDesiredCompensation: entry.profileDesiredCompensation,
    profileQualifiedIndustries: entry.profileQualifiedIndustries,
    profileQualifiedSkills: entry.profileQualifiedSkills,
    profileCountry: entry.profileCountry,
    profileTimezone: entry.profileTimezone,
  });
}

function normalizeReportEntryFitScore(
  entry: AnalysisReportCacheEntry,
): number {
  return resolveReportFitScoreFromCacheEntry(entry);
}

/** Align stats/KPI rows with cached report scores shown in activity lists. */
export function resolveActivityAnalysisRecord(
  item: RecentActivityItem,
): RecentActivityItem {
  const cached = loadAnalysisReport(item.report_id);
  if (!cached) return item;

  const result = normalizeCachedReportEntry(cached);
  const fitScore = resolveReportFitScoreFromCacheEntry(cached);
  return {
    ...item,
    fit_score: fitScore,
    qualification_score: result.score.qualificationScore,
    confidence_score: result.score.confidenceScore,
    recommendation: result.score.recommendation ?? item.recommendation,
    recommendation_label:
      result.score.recommendationLabel ?? item.recommendation_label,
  };
}

/** Report ring score (0–100) for a fit-analysis activity row. */
export function resolveActivityFitScore(item: RecentActivityItem): number {
  const cached = loadAnalysisReport(item.report_id);
  if (cached) {
    return normalizeReportEntryFitScore(cached);
  }
  return item.fit_score ?? 0;
}

export function resolveActivityResumeScore(item: RecentActivityItem): number {
  return item.resume_score ?? 0;
}

/** Record a generated report for Recent activity (independent of Save Report). */
export function recordRecentActivityFromReport(
  reportId: string,
  entry: AnalysisReportCacheEntry,
): void {
  if (isSampleActivityReportId(reportId)) return;
  clearQaEmptyActivityMark();
  const { result, analysisId } = entry;
  const created_at = new Date().toISOString();
  const displayFitScore = normalizeReportEntryFitScore(entry);
  const next: RecentActivityEntry = {
    reportId,
    analysisId,
    job_title:
      result.jobTitle?.trim() ||
      result.parsedJob.roleTitle?.trim() ||
      "Job",
    company_name: result.companyName?.trim() || null,
    fit_score: displayFitScore,
    qualification_score: result.score.qualificationScore,
    confidence_score: result.score.confidenceScore,
    recommendation: result.score.recommendation,
    recommendation_label: result.score.recommendationLabel,
    created_at,
  };

  const stored = readStored().filter(
    (item) =>
      item.reportId !== reportId &&
      (analysisId == null || item.analysisId !== analysisId),
  );
  writeStored([next, ...stored]);
}

/** Record a completed resume score for Recent activity. */
export function recordRecentResumeScoreActivity(
  review: ResumeReviewResult,
  fileName: string,
): void {
  clearQaEmptyActivityMark();
  const reportId = `resume-review:${review.id}`;
  const resumeScore = getResumeReviewMasterScore(review);
  const title = fileName.trim() || "Resume score";
  const next: RecentActivityEntry = {
    kind: "resume_score",
    reportId,
    analysisId: null,
    job_title: title,
    company_name: null,
    fit_score: null,
    qualification_score: null,
    confidence_score: null,
    recommendation: null,
    recommendation_label: null,
    resume_score: resumeScore,
    file_name: fileName.trim() || null,
    created_at: new Date().toISOString(),
  };

  const stored = readStored().filter((item) => item.reportId !== reportId);
  writeStored([next, ...stored]);
}

export function loadRecentActivity(): RecentActivityEntry[] {
  return readStored();
}

export function clearRecentActivity(): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

/** Drop sample-report rows that were accidentally tracked as recent activity. */
export function purgeSampleRecentActivityEntries(): void {
  if (typeof localStorage === "undefined") return;
  const entries = readStored().filter(
    (entry) => !isSampleActivityReportId(entry.reportId),
  );
  if (entries.length === readStored().length) return;
  if (entries.length === 0) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  writeStored(entries);
}

function recentEntryToAnalysisRecord(entry: RecentActivityEntry): RecentActivityItem {
  const kind = entry.kind ?? "fit_analysis";
  return {
    id: entry.analysisId ?? entry.reportId,
    report_id: entry.reportId,
    company_name: entry.company_name,
    job_title: entry.job_title,
    qualification_score: entry.qualification_score,
    fit_score: entry.fit_score,
    confidence_score: entry.confidence_score,
    career_fit_adjustment: null,
    recommendation: entry.recommendation,
    recommendation_label: entry.recommendation_label,
    narrative_json: null,
    parsed_job_json: null,
    created_at: entry.created_at,
    activity_kind: kind,
    resume_score: entry.resume_score ?? null,
  };
}

/** Subtitle for activity list rows — when Analyze Fit was run. */
export function activityMetaLine(item: RecentActivityItem): string | null {
  const ago = formatRelativeTimeAgo(item.created_at);
  return ago ? ago.toLowerCase() : null;
}

/** Merge persisted analyses with locally tracked reports; newest first. */
export function mergeRecentActivity(
  dbRows: AnalysisRecord[],
  localRows: RecentActivityEntry[],
  limit: number,
): RecentActivityItem[] {
  const merged = new Map<string, RecentActivityItem>();

  for (const row of dbRows) {
    merged.set(row.id, { ...row, report_id: row.id });
  }

  for (const local of localRows) {
    const id = local.analysisId ?? local.reportId;
    const fromLocal = recentEntryToAnalysisRecord(local);
    const existing = merged.get(id);

    if (existing) {
      merged.set(id, {
        ...existing,
        report_id: local.reportId,
        job_title: existing.job_title?.trim() || fromLocal.job_title,
        company_name: existing.company_name?.trim() || fromLocal.company_name,
        recommendation_label:
          existing.recommendation_label || fromLocal.recommendation_label,
        fit_score: fromLocal.fit_score ?? existing.fit_score,
        qualification_score:
          existing.qualification_score ?? fromLocal.qualification_score,
        confidence_score:
          existing.confidence_score ?? fromLocal.confidence_score,
        recommendation: existing.recommendation ?? fromLocal.recommendation,
      });
    } else {
      merged.set(id, fromLocal);
    }
  }

  return [...merged.values()]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    .slice(0, limit);
}

export function matchesReportSearchQuery(
  item: Pick<RecentActivityItem, "job_title" | "company_name" | "activity_kind" | "report_id">,
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const resumeLabel = isResumeScoreActivity(item) ? "resume score score" : "";
  return `${item.job_title ?? ""} ${item.company_name ?? ""} ${resumeLabel}`
    .toLowerCase()
    .includes(q);
}

export { reportHrefForAnalysis } from "@/lib/report-navigation";
