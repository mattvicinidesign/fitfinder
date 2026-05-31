"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { GuestUpgradePrompt } from "@/components/guest-upgrade-prompt";
import { useSearchParams } from "next/navigation";
import { AnalysisResultView } from "@/components/analysis-result";
import { SaveReportButton } from "@/components/save-job-button";
import {
  fetchProfileDesiredCompensation,
  fetchProfileQualifiedIndustries,
  fetchProfileCountry,
  fetchProfileTimezone,
} from "@/lib/profile-compensation";
import {
  loadAnalysisReport,
  type AnalysisReportCacheEntry,
} from "@/lib/analysis-report-cache";
import type { Compensation } from "@/lib/types";
import { SkeletonAnalysisReport } from "@/components/ui/skeletons";

export function AnalysisReportScreen() {
  const searchParams = useSearchParams();
  const reportId = searchParams.get("id");

  const [entry, setEntry] = useState<AnalysisReportCacheEntry | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [profileDesiredCompensation, setProfileDesiredCompensation] =
    useState<Compensation | null>(null);
  const [profileQualifiedIndustries, setProfileQualifiedIndustries] = useState<
    string[]
  >([]);
  const [profileCountry, setProfileCountry] = useState<string | null>(null);
  const [profileTimezone, setProfileTimezone] = useState<string | null>(null);

  useEffect(() => {
    if (!reportId) {
      setLoaded(true);
      return;
    }
    setEntry(loadAnalysisReport(reportId));
    setLoaded(true);
  }, [reportId]);

  useEffect(() => {
    void Promise.all([
      fetchProfileDesiredCompensation(),
      fetchProfileQualifiedIndustries(),
      fetchProfileCountry(),
      fetchProfileTimezone(),
    ]).then(([pay, industries, country, timezone]) => {
      setProfileDesiredCompensation(pay);
      setProfileQualifiedIndustries(industries);
      setProfileCountry(country);
      setProfileTimezone(timezone);
    });
  }, []);

  if (!loaded) {
    return (
      <ReportShell>
        <SkeletonAnalysisReport />
      </ReportShell>
    );
  }

  if (!reportId) {
    return (
      <ReportShell>
        <p className="px-4 py-12 text-center text-[15px] text-muted-foreground">
          Missing report link.{" "}
          <Link href="/analyze" className="text-primary underline-offset-2 hover:underline">
            Run a new analysis
          </Link>
        </p>
      </ReportShell>
    );
  }

  if (!entry) {
    return (
      <ReportShell>
        <p className="px-4 py-12 text-center text-[15px] text-muted-foreground">
          This report is no longer available in your session.{" "}
          <Link href="/analyze" className="text-primary underline-offset-2 hover:underline">
            Analyze again
          </Link>
        </p>
      </ReportShell>
    );
  }

  return (
    <ReportShell
      footer={<SaveReportButton analysisId={entry.analysisId} />}
    >
      <div className="px-4 pb-6">
        <AnalysisResultView
          result={entry.result}
          analysisId={entry.analysisId}
          profileDesiredCompensation={
            entry.profileDesiredCompensation ?? profileDesiredCompensation
          }
          profileQualifiedIndustries={
            entry.profileQualifiedIndustries ?? profileQualifiedIndustries
          }
          profileCountry={entry.profileCountry ?? profileCountry}
          profileTimezone={entry.profileTimezone ?? profileTimezone}
        />
      </div>
      <div className="pb-6">
        <GuestUpgradePrompt variant="save" />
      </div>
    </ReportShell>
  );
}

function ReportShell({
  children,
  footer,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <header className="sticky top-0 z-10 shrink-0 border-b border-border/60 bg-background px-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2.5">
        <Link
          href="/analyze"
          aria-label="Back to Analyze"
          className="-ml-1.5 inline-flex items-center rounded-md p-1 text-primary transition-colors hover:bg-primary/10"
        >
          <ChevronLeft className="size-5 shrink-0" aria-hidden />
        </Link>
      </header>
      <div
        className={
          footer
            ? "min-h-0 flex-1 overflow-y-auto pb-24"
            : "min-h-0 flex-1 overflow-y-auto"
        }
      >
        {children}
      </div>
      {footer ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="pointer-events-auto">{footer}</div>
        </div>
      ) : null}
    </div>
  );
}
