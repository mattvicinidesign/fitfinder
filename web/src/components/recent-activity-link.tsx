"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import {
  isResumeScoreActivity,
  type RecentActivityItem,
} from "@/lib/recent-activity";
import { ReportLink } from "@/components/report-link";
import { markReportReturnPath } from "@/lib/report-return";
import { ensureSampleAnalysisDataSeeded } from "@/lib/sample-analyses";

type RecentActivityLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  item: RecentActivityItem;
  from: string;
};

export function RecentActivityLink({
  item,
  from,
  onClick,
  ...props
}: RecentActivityLinkProps) {
  if (isResumeScoreActivity(item)) {
    return (
      <Link
        {...props}
        href="/resume-review"
        onClick={(event) => {
          markReportReturnPath(from);
          onClick?.(event);
        }}
      />
    );
  }

  return (
    <ReportLink
      {...props}
      from={from}
      analysis={item}
      onClick={(event) => {
        ensureSampleAnalysisDataSeeded();
        onClick?.(event);
      }}
    />
  );
}
