import { computeHomeFitStats, type HomeFitStats } from "@/lib/analysis-stats";
import {
  loadRecentActivity,
  mergeRecentActivity,
  isResumeScoreActivity,
  resolveActivityAnalysisRecord,
  type RecentActivityItem,
} from "@/lib/recent-activity";
import {
  ensureSampleAnalysisDataSeeded,
  filterOpenableAnalyses,
  filterRecentActivity,
  getSampleAnalyses,
  pickAnalysisListWithSamples,
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
  const statsSource = pickAnalysisListWithSamples(
    filterOpenableAnalyses(
      merged.filter((item) => !isResumeScoreActivity(item)),
    ),
    getSampleAnalyses(),
  );
  const openableCount = shouldForceEmptyActivityLists()
    ? 0
    : filterRecentActivity(merged).length;
  return {
    analyses: pickRecentActivityList(merged, recentLimit),
    fitStats: computeHomeFitStats(
      statsSource.map(resolveActivityAnalysisRecord),
    ),
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
