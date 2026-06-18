import { computeHomeFitStats, type HomeFitStats } from "@/lib/analysis-stats";
import {
  loadRecentActivity,
  mergeRecentActivity,
  type RecentActivityItem,
} from "@/lib/recent-activity";
import {
  ensureSampleAnalysisDataSeeded,
  getSampleAnalyses,
  pickAnalysisListWithSamples,
  pickRecentActivityList,
} from "@/lib/sample-analyses";
import type { AnalysisRecord } from "@/lib/types";

export type HomeActivitySnapshot = {
  analyses: RecentActivityItem[];
  fitStats: HomeFitStats;
};

let cachedSnapshot: HomeActivitySnapshot | null = null;

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
  const statsSource = pickAnalysisListWithSamples(merged, getSampleAnalyses());
  return {
    analyses: pickRecentActivityList(merged, recentLimit),
    fitStats: computeHomeFitStats(statsSource),
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
