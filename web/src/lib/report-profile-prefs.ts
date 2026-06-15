import type { AnalysisReportCacheEntry } from "@/lib/analysis-report-cache";

/** Prefer live profile prefs; ignore stale empty arrays saved on older reports. */
export function resolveReportPreferredCompanyTypes(
  live: string[] | null | undefined,
  cached: AnalysisReportCacheEntry | null | undefined,
): string[] {
  if (live && live.length > 0) return live;
  const fromCache = cached?.profilePreferredCompanyTypes;
  if (fromCache && fromCache.length > 0) return fromCache;
  return live ?? [];
}

/** Prefer live profile floor; fall back to cached snapshot when live is unset. */
export function resolveReportPreferredMinimumEmployerRating(
  live: number | null | undefined,
  cached: AnalysisReportCacheEntry | null | undefined,
): number | null {
  if (live != null && Number.isFinite(live)) return live;
  const fromCache = cached?.profilePreferredMinimumEmployerRating;
  if (fromCache != null && Number.isFinite(fromCache)) return fromCache;
  return live ?? null;
}
