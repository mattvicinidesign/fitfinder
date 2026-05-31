import { buildPostingHeaderMetaLine } from "@/lib/posting-header-meta";
import type { AnalysisRecord, Recommendation } from "@/lib/types";
import type { AnalysisReportCacheEntry } from "@/lib/analysis-report-cache";

export type RecentActivityEntry = {
  reportId: string;
  analysisId: string | null;
  job_title: string | null;
  company_name: string | null;
  meta_line: string | null;
  fit_score: number | null;
  qualification_score: number | null;
  confidence_score: number | null;
  recommendation: Recommendation | null;
  recommendation_label: string | null;
  created_at: string;
};

export type RecentActivityItem = AnalysisRecord & {
  activity_meta_line?: string | null;
};

const STORAGE_KEY = "fitfinder:recent-activity";
const MAX_STORED = 50;

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

/** Record a generated report for Recent activity (independent of Save Report). */
export function recordRecentActivityFromReport(
  reportId: string,
  entry: AnalysisReportCacheEntry,
): void {
  const { result, analysisId } = entry;
  const created_at = new Date().toISOString();
  const next: RecentActivityEntry = {
    reportId,
    analysisId,
    job_title:
      result.jobTitle?.trim() ||
      result.parsedJob.roleTitle?.trim() ||
      "Job",
    company_name: result.companyName?.trim() || null,
    meta_line:
      buildPostingHeaderMetaLine({
        parsedJob: result.parsedJob,
        jobDescription: result.jobDescription,
        jobTitle: result.jobTitle,
        companyName: result.companyName,
        postingContext: result.postingContext,
      }) ?? null,
    fit_score: result.score.fitScore,
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

export function loadRecentActivity(): RecentActivityEntry[] {
  return readStored();
}

function recentEntryToAnalysisRecord(entry: RecentActivityEntry): RecentActivityItem {
  return {
    id: entry.analysisId ?? entry.reportId,
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
    activity_meta_line: entry.meta_line,
  };
}

/** Subtitle for recent activity rows: Upwork Client | Agency | 4 Days Ago | Worldwide */
export function activityMetaLine(item: RecentActivityItem): string | null {
  if (item.activity_meta_line?.trim()) return item.activity_meta_line.trim();
  return (
    buildPostingHeaderMetaLine({
      parsedJob: item.parsed_job_json ?? undefined,
      jobDescription: item.job_description,
      jobTitle: item.job_title,
      companyName: item.company_name,
    }) ?? null
  );
}

/** Merge persisted analyses with locally tracked reports; newest first. */
export function mergeRecentActivity(
  dbRows: AnalysisRecord[],
  localRows: RecentActivityEntry[],
  limit: number,
): RecentActivityItem[] {
  const merged = new Map<string, RecentActivityItem>();

  for (const row of dbRows) {
    merged.set(row.id, { ...row });
  }

  for (const local of localRows) {
    const id = local.analysisId ?? local.reportId;
    const fromLocal = recentEntryToAnalysisRecord(local);
    const existing = merged.get(id);

    if (existing) {
      merged.set(id, {
        ...existing,
        job_title: existing.job_title?.trim() || fromLocal.job_title,
        company_name: existing.company_name?.trim() || fromLocal.company_name,
        activity_meta_line:
          existing.activity_meta_line?.trim() || fromLocal.activity_meta_line,
        recommendation_label:
          existing.recommendation_label || fromLocal.recommendation_label,
        fit_score: existing.fit_score ?? fromLocal.fit_score,
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

export function reportHrefForAnalysis(analysis: Pick<AnalysisRecord, "id">): string {
  return `/analyze/report?id=${encodeURIComponent(analysis.id)}`;
}
