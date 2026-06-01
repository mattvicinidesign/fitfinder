"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import {
  reportHrefForReportId,
  resolveReportCacheId,
} from "@/lib/report-navigation";
import { ensureSampleAnalysisDataSeeded } from "@/lib/sample-analyses";
import { markReportReturnPath } from "@/lib/report-return";
import type { AnalysisRecord } from "@/lib/types";

type ReportLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  from: string;
} & (
  | { reportId: string; analysis?: never }
  | {
      analysis: Pick<AnalysisRecord, "id"> & { report_id?: string };
      reportId?: never;
    }
);

/**
 * Opens a report and stores the return route for the back button (sessionStorage).
 * Uses normal Link navigation — do not force full page loads on Capacitor.
 */
export function ReportLink({
  from,
  reportId,
  analysis,
  onClick,
  ...props
}: ReportLinkProps) {
  const cacheId = reportId ?? resolveReportCacheId(analysis!);
  const href = reportHrefForReportId(cacheId, from);

  return (
    <Link
      {...props}
      href={href}
      onClick={(event) => {
        ensureSampleAnalysisDataSeeded();
        markReportReturnPath(from);
        onClick?.(event);
      }}
    />
  );
}
