"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { AnalysisResultView } from "@/components/analysis-result";
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

export function AnalysisReportScreen() {
  const searchParams = useSearchParams();
  const reportId = searchParams.get("id");

  const [entry, setEntry] = useState<AnalysisReportCacheEntry | null>(null);
  const [profileDesiredCompensation, setProfileDesiredCompensation] =
    useState<Compensation | null>(null);
  const [profileQualifiedIndustries, setProfileQualifiedIndustries] = useState<
    string[]
  >([]);
  const [profileCountry, setProfileCountry] = useState<string | null>(null);
  const [profileTimezone, setProfileTimezone] = useState<string | null>(null);

  useEffect(() => {
    if (!reportId) return;
    const cached = loadAnalysisReport(reportId);
    setEntry(cached);
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
    <ReportShell>
      <div className="px-4 pb-8">
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
    </ReportShell>
  );
}

function ReportShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="sticky top-0 z-10 shrink-0 border-b border-border/60 bg-background px-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2.5">
        <Link
          href="/analyze"
          className="-ml-1.5 inline-flex items-center gap-0.5 rounded-md py-1 pr-2 pl-1 text-[15px] font-medium text-primary transition-colors hover:bg-primary/10"
        >
          <ChevronLeft className="size-5 shrink-0" aria-hidden />
          Analyze
        </Link>
      </header>
      {children}
    </>
  );
}
