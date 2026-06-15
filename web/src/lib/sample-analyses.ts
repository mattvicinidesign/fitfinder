import {
  loadAnalysisReport,
  saveAnalysisReport,
  type AnalysisReportCacheEntry,
} from "@/lib/analysis-report-cache";
import {
  loadRecentActivity,
  type RecentActivityItem,
} from "@/lib/recent-activity";
import { buildSampleAnalysisResult } from "@/lib/sample-report-fixtures";
import { loadLocalProfilePrefs } from "@/lib/local-profile-prefs";
import { normalizeAnalysisResult } from "@/lib/normalize-score";
import type { AnalysisRecord, AnalysisResult, Recommendation } from "@/lib/types";

const SEED_VERSION = "v5";
const SEED_KEY = `fitfinder-sample-data-${SEED_VERSION}`;
const RECENT_ACTIVITY_KEY = "fitfinder:recent-activity";

export const SAMPLE_REPORT_IDS = [
  "sample-analysis-1",
  "sample-analysis-2",
  "sample-analysis-3",
  "sample-analysis-4",
  "sample-analysis-5",
] as const;

export const SAMPLE_SAVED_REPORT_IDS = [
  "sample-analysis-1",
  "sample-analysis-2",
  "sample-analysis-4",
] as const;

type SampleSpec = {
  id: (typeof SAMPLE_REPORT_IDS)[number];
  job_title: string;
  company_name: string | null;
  hireArea: string;
  fit_score: number;
  qualification_score: number;
  confidence_score: number;
  recommendation: Recommendation;
  recommendation_label: string;
  daysAgo: number;
};

const SPECS: SampleSpec[] = [
  {
    id: "sample-analysis-1",
    job_title: "Senior Product Designer",
    company_name: "Northline SaaS",
    hireArea: "Worldwide",
    fit_score: 89,
    qualification_score: 82,
    confidence_score: 74,
    recommendation: "strong_apply",
    recommendation_label: "Strong Pursuit",
    daysAgo: 2,
  },
  {
    id: "sample-analysis-2",
    job_title: "UX Research Lead",
    company_name: "Helio Health",
    hireArea: "United States",
    fit_score: 76,
    qualification_score: 71,
    confidence_score: 68,
    recommendation: "apply",
    recommendation_label: "Good Opportunity",
    daysAgo: 5,
  },
  {
    id: "sample-analysis-3",
    job_title: "AI Product Designer",
    company_name: "Vector Labs",
    hireArea: "Worldwide",
    fit_score: 62,
    qualification_score: 58,
    confidence_score: 55,
    recommendation: "stretch",
    recommendation_label: "Proceed With Caution",
    daysAgo: 7,
  },
  {
    id: "sample-analysis-4",
    job_title: "Design Systems Specialist",
    company_name: "Meridian Enterprise",
    hireArea: "Canada",
    fit_score: 84,
    qualification_score: 79,
    confidence_score: 70,
    recommendation: "strong_apply",
    recommendation_label: "Strong Pursuit",
    daysAgo: 3,
  },
  {
    id: "sample-analysis-5",
    job_title: "Freelance Brand Designer",
    company_name: "Studio Rowan",
    hireArea: "United Kingdom",
    fit_score: 71,
    qualification_score: 67,
    confidence_score: 64,
    recommendation: "apply",
    recommendation_label: "Good Opportunity",
    daysAgo: 14,
  },
];

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function buildSampleResult(spec: SampleSpec): AnalysisResult {
  return buildSampleAnalysisResult({
    jobTitle: spec.job_title,
    companyName: spec.company_name ?? "Client",
    hireArea: spec.hireArea,
    fitScore: spec.fit_score,
    qualificationScore: spec.qualification_score,
    confidenceScore: spec.confidence_score,
    recommendation: spec.recommendation,
    recommendationLabel: spec.recommendation_label,
  });
}

function sampleEntry(spec: SampleSpec): AnalysisReportCacheEntry {
  const prefs = loadLocalProfilePrefs();
  return {
    result: buildSampleResult(spec),
    analysisId: null,
    profilePreferredCompanyTypes: prefs?.preferredCompanyTypes ?? ["Enterprise"],
    profilePreferredMinimumEmployerRating:
      prefs?.preferredMinimumEmployerRating ?? 5,
  };
}

function specToRecord(spec: SampleSpec): RecentActivityItem {
  const result = buildSampleResult(spec);
  const { score } = normalizeAnalysisResult(result);
  return {
    id: spec.id,
    report_id: spec.id,
    company_name: spec.company_name,
    job_title: spec.job_title,
    qualification_score: spec.qualification_score,
    fit_score: score.fitScore,
    confidence_score: spec.confidence_score,
    career_fit_adjustment: 5,
    recommendation: spec.recommendation,
    recommendation_label: spec.recommendation_label,
    narrative_json: null,
    parsed_job_json: null,
    created_at: isoDaysAgo(spec.daysAgo),
  };
}

export function getSampleAnalyses(): RecentActivityItem[] {
  return SPECS.map(specToRecord);
}

export function getSampleSavedAnalyses(): RecentActivityItem[] {
  const byId = new Map(getSampleAnalyses().map((a) => [a.id, a]));
  return SAMPLE_SAVED_REPORT_IDS.map((id) => byId.get(id)).filter(
    (row): row is RecentActivityItem => row != null,
  );
}

export function isSampleReportId(reportId: string): boolean {
  return reportId.startsWith("sample-analysis-");
}

export function loadSampleAnalysisReport(
  reportId: string,
): AnalysisReportCacheEntry | null {
  const spec = SPECS.find((s) => s.id === reportId);
  if (!spec) return null;
  return sampleEntry(spec);
}

function isUsableCachedReport(entry: AnalysisReportCacheEntry | null): boolean {
  if (!entry?.result?.score) return false;
  const score = entry.result.score;
  if ((score.opportunityCategories?.length ?? 0) > 0) return true;
  if ((score.categoryBreakdown?.length ?? 0) > 0) return true;
  return typeof score.fitScore === "number" && Number.isFinite(score.fitScore);
}

function sampleReportIsComplete(reportId: string): boolean {
  return isUsableCachedReport(loadAnalysisReport(reportId));
}

/** Load a report from session cache or rebuild sample fixtures. */
export function resolveReportEntry(
  reportId: string,
): AnalysisReportCacheEntry | null {
  const cached = loadAnalysisReport(reportId);
  if (isUsableCachedReport(cached)) {
    return cached;
  }

  if (isSampleReportId(reportId)) {
    const sample = loadSampleAnalysisReport(reportId);
    if (sample) {
      saveAnalysisReport(reportId, sample);
      return sample;
    }
  }

  return null;
}

export function canOpenReport(reportId: string): boolean {
  return resolveReportEntry(reportId) !== null;
}

export function reportCacheIdForItem(
  item: Pick<AnalysisRecord, "id"> & { report_id?: string },
): string {
  return item.report_id?.trim() || item.id;
}

export function canOpenAnalysisItem(
  item: Pick<AnalysisRecord, "id"> & { report_id?: string },
): boolean {
  return canOpenReport(reportCacheIdForItem(item));
}

/** Drop list rows that cannot open a report (stale localStorage ids, etc.). */
export function filterOpenableAnalyses<
  T extends AnalysisRecord & { report_id?: string },
>(items: T[]): T[] {
  return items.filter((item) => canOpenAnalysisItem(item));
}

/** Recent activity for home — openable rows first, else canonical samples. */
export function pickRecentActivityList(
  merged: RecentActivityItem[],
  limit: number,
): RecentActivityItem[] {
  const loadable = filterOpenableAnalyses(merged);
  if (loadable.length > 0) {
    return loadable.slice(0, limit);
  }
  return getSampleAnalyses().slice(0, limit);
}

/** Saved/history — openable DB rows first, else sample saved list. */
export function pickAnalysisListWithSamples<T extends AnalysisRecord & { report_id?: string }>(
  rows: T[],
  samples: T[],
): T[] {
  const loadable = filterOpenableAnalyses(rows);
  return loadable.length > 0 ? loadable : samples;
}

function clearLegacySeedKeys(): void {
  if (typeof localStorage === "undefined") return;
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key?.startsWith("fitfinder-sample-data-") && key !== SEED_KEY) {
      localStorage.removeItem(key);
    }
  }
}

function ensureAllSampleReportsCached(): void {
  for (const spec of SPECS) {
    if (!sampleReportIsComplete(spec.id)) {
      saveAnalysisReport(spec.id, sampleEntry(spec));
    }
  }
}

function recentActivityIsValid(): boolean {
  const entries = loadRecentActivity();
  if (entries.length === 0) return false;
  return entries.every((entry) => canOpenReport(entry.reportId));
}

/** Replace stale recent-activity rows with sample reports that match SPECS. */
function resetSampleRecentActivity(): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(RECENT_ACTIVITY_KEY);
  for (const spec of SPECS) {
    saveAnalysisReport(spec.id, sampleEntry(spec));
  }
}

/**
 * Seed session report cache + recent activity.
 * Repairs stale rows (e.g. old job titles whose report ids no longer exist).
 */
export function ensureSampleAnalysisDataSeeded(): void {
  if (typeof window === "undefined") return;

  clearLegacySeedKeys();
  ensureAllSampleReportsCached();

  const seeded = localStorage.getItem(SEED_KEY) === "true";
  if (!seeded || !recentActivityIsValid()) {
    resetSampleRecentActivity();
  }

  localStorage.setItem(SEED_KEY, "true");
}

/** @deprecated Use pickAnalysisListWithSamples or pickRecentActivityList */
export function withSampleFallback<T extends AnalysisRecord>(
  rows: T[],
  samples: T[],
): T[] {
  return rows.length > 0 ? rows : samples;
}
