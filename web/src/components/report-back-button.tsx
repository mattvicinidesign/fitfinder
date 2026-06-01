"use client";

import { useLayoutEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CircleBackButton } from "@/components/ui/circle-back-button";
import { resolveReportReturnPath } from "@/lib/report-navigation";
import {
  goBackFromReport,
  markReportReturnPath,
  REPORT_FROM_PARAM,
} from "@/lib/report-return";

export function ReportBackButton() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromQuery = searchParams.get(REPORT_FROM_PARAM);

  useLayoutEffect(() => {
    if (fromQuery) {
      markReportReturnPath(resolveReportReturnPath(fromQuery));
    }
  }, [fromQuery]);

  return (
    <CircleBackButton
      onClick={() => goBackFromReport(router, fromQuery)}
    />
  );
}
