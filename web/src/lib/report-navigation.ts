import { APP_NAV, FIT_FINDER_PREVIEW_PATH } from "@/lib/navigation";
import type { AnalysisRecord } from "@/lib/types";

/** Query param carrying the in-app route to return to from a report. */
export const REPORT_FROM_PARAM = "from";

const DEFAULT_REPORT_RETURN = "/analyze";

const ALLOWED_RETURN_PATHS = new Set([
  ...APP_NAV.map((item) => item.href),
  FIT_FINDER_PREVIEW_PATH,
]);

function sanitizeReturnPath(path: string): string {
  if (!path.startsWith("/") || path.startsWith("//")) {
    return DEFAULT_REPORT_RETURN;
  }

  const pathname = path.split(/[?#]/)[0] ?? path;
  const allowed = [...ALLOWED_RETURN_PATHS].some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  return allowed ? pathname : DEFAULT_REPORT_RETURN;
}

export function resolveReportReturnPath(fromParam: string | null): string {
  if (!fromParam?.trim()) return DEFAULT_REPORT_RETURN;
  try {
    return sanitizeReturnPath(decodeURIComponent(fromParam.trim()));
  } catch {
    return DEFAULT_REPORT_RETURN;
  }
}

function buildReportHref(reportId: string, from: string): string {
  const id = encodeURIComponent(reportId);
  const fromPath = encodeURIComponent(sanitizeReturnPath(from));
  return `/analyze/report?id=${id}&${REPORT_FROM_PARAM}=${fromPath}`;
}

/** Session cache key for a list row (recent activity may differ from analysis id). */
export function resolveReportCacheId(
  item: Pick<AnalysisRecord, "id"> & { report_id?: string },
): string {
  return item.report_id?.trim() || item.id;
}

export function reportHrefForAnalysis(
  analysis: Pick<AnalysisRecord, "id"> & { report_id?: string },
  from: string,
): string {
  return buildReportHref(resolveReportCacheId(analysis), from);
}

export function reportHrefForReportId(reportId: string, from: string): string {
  return buildReportHref(reportId, from);
}
