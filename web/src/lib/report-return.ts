import {
  REPORT_FROM_PARAM,
  reportHrefForReportId,
  resolveReportReturnPath,
} from "@/lib/report-navigation";

const REPORT_RETURN_PATH_KEY = "fitfinder-report-return-path";

type AppRouter = {
  push: (href: string) => void;
  replace: (href: string) => void;
};

/** Remember where to return when leaving a report (required for Capacitor static export). */
export function markReportReturnPath(fromPath: string): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(
    REPORT_RETURN_PATH_KEY,
    resolveReportReturnPath(fromPath),
  );
}

export function getReportReturnPath(): string {
  if (typeof sessionStorage === "undefined") {
    return resolveReportReturnPath(null);
  }
  const path = sessionStorage.getItem(REPORT_RETURN_PATH_KEY);
  return resolveReportReturnPath(path);
}

export function clearReportReturnPath(): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(REPORT_RETURN_PATH_KEY);
}

/** Prefer `from` query param (on report URL), then sessionStorage. */
export function resolveReportReturnTo(fromQueryParam: string | null): string {
  if (fromQueryParam?.trim()) {
    return resolveReportReturnPath(fromQueryParam);
  }
  return getReportReturnPath();
}

/** Leave a report — client-side replace on web and native (same as profile sheet). */
export function goBackFromReport(
  router: AppRouter,
  fromQueryParam: string | null = null,
): void {
  const returnTo = resolveReportReturnTo(fromQueryParam);
  clearReportReturnPath();
  router.replace(returnTo);
}

/** Open a report and persist the return route (works on web and Capacitor). */
export function openAnalysisReport(
  reportId: string,
  from: string,
  router: AppRouter,
): void {
  markReportReturnPath(from);
  router.push(reportHrefForReportId(reportId, from));
}

export { REPORT_FROM_PARAM };
