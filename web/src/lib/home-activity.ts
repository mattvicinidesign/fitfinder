import {
  computeHomeFitStats,
  formatLatestActivityAgoLabel,
  type HomeFitStats,
} from "@/lib/analysis-stats";
import {
  loadRecentActivity,
  mergeRecentActivity,
  isResumeScoreActivity,
  resolveActivityAnalysisRecord,
  type RecentActivityItem,
} from "@/lib/recent-activity";
import {
  ensureSampleAnalysisDataSeeded,
  filterRecentActivity,
  pickRecentActivityList,
} from "@/lib/sample-analyses";
import type { AnalysisRecord } from "@/lib/types";
import { shouldForceEmptyActivityLists } from "@/lib/qa-activity";

export type HomeActivitySnapshot = {
  analyses: RecentActivityItem[];
  fitStats: HomeFitStats;
  hasMoreActivity: boolean;
};

let cachedSnapshot: HomeActivitySnapshot | null = null;

export function resetHomeActivitySnapshot(): void {
  cachedSnapshot = null;
}

export function buildHomeActivitySnapshot(
  dbRows: AnalysisRecord[],
  recentLimit: number,
): HomeActivitySnapshot {
  ensureSampleAnalysisDataSeeded();
  const localRows = loadRecentActivity();
  const merged = mergeRecentActivity(
    dbRows,
    localRows,
    Number.MAX_SAFE_INTEGER,
  );
  const activityItems = shouldForceEmptyActivityLists()
    ? []
    : filterRecentActivity(merged);
  const fitActivityItems = activityItems.filter(
    (item) => !isResumeScoreActivity(item),
  );
  const openableCount = activityItems.length;
  const lastActivityAgoLabel = formatLatestActivityAgoLabel(activityItems);
  const fitStats: HomeFitStats =
    fitActivityItems.length === 0
      ? {
          averageFitOnTen: 0,
          analyzedCount: 0,
          lastActivityAgoLabel,
        }
      : {
          ...computeHomeFitStats(
            fitActivityItems.map(resolveActivityAnalysisRecord),
          ),
          lastActivityAgoLabel,
        };
  return {
    analyses: pickRecentActivityList(merged, recentLimit),
    fitStats,
    hasMoreActivity: openableCount > recentLimit,
  };
}

/** Sync snapshot for instant home paint — warmed on first read and after each fetch. */
export function readHomeActivitySnapshot(recentLimit: number): HomeActivitySnapshot {
  if (cachedSnapshot) return cachedSnapshot;
  cachedSnapshot = buildHomeActivitySnapshot([], recentLimit);
  return cachedSnapshot;
}

export function writeHomeActivitySnapshot(snapshot: HomeActivitySnapshot): void {
  cachedSnapshot = snapshot;
}
