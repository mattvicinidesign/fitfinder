"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ReportBackButton } from "@/components/report-back-button";
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
import type { AnalysisReportCacheEntry } from "@/lib/analysis-report-cache";
import { resolveReportEntry } from "@/lib/sample-analyses";
import type { Compensation } from "@/lib/types";
import { SkeletonAnalysisReport } from "@/components/ui/skeletons";
import {
  screenShellClass,
  StickyBottomCta,
  StickyScreenBody,
  StickyScreenHeader,
} from "@/components/ui/sticky-bottom-cta";
import { safeTopCompact } from "@/lib/safe-area";
import { screenGutterX } from "@/lib/screen-gutter";

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
    setEntry(resolveReportEntry(reportId));
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
        <p className="py-12 text-center text-[15px] text-muted-foreground">
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
      <div className="pb-6">
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
        <GuestUpgradePrompt variant="save" className="mx-0 w-full" />
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
    <div className={screenShellClass}>
      <StickyScreenHeader className={`px-4 pb-2.5 ${safeTopCompact}`}>
        <ReportBackButton />
      </StickyScreenHeader>
      <StickyScreenBody className={screenGutterX}>{children}</StickyScreenBody>
      {footer ? <StickyBottomCta>{footer}</StickyBottomCta> : null}
    </div>
  );
}
