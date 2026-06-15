import type { AnalysisReportCacheEntry } from "@/lib/analysis-report-cache";
import { clampEmployerRatingPreference } from "@/lib/employer-rating-match";
import { loadLocalProfilePrefs } from "@/lib/local-profile-prefs";

/** Prefer live profile prefs; ignore stale empty arrays saved on older reports. */
export function resolveReportPreferredCompanyTypes(
  live: string[] | null | undefined,
  cached: AnalysisReportCacheEntry | null | undefined,
): string[] {
  if (live && live.length > 0) return live;
  const fromCache = cached?.profilePreferredCompanyTypes;
  if (fromCache && fromCache.length > 0) return fromCache;
  const fromLocal = loadLocalProfilePrefs()?.preferredCompanyTypes;
  if (fromLocal && fromLocal.length > 0) return fromLocal;
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
  const fromLocal = clampEmployerRatingPreference(
    loadLocalProfilePrefs()?.preferredMinimumEmployerRating,
  );
  if (fromLocal != null) return fromLocal;
  return live ?? null;
}
