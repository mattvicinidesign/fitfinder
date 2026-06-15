"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ReportBackButton } from "@/components/report-back-button";
import { useSearchParams } from "next/navigation";
import { AnalysisResultView } from "@/components/analysis-result";
import { SaveReportButton } from "@/components/save-job-button";
import {
  fetchProfileDesiredCompensation,
  fetchProfileQualifiedIndustries,
  fetchProfileQualifiedSkills,
  fetchProfileCountry,
  fetchProfileTimezone,
} from "@/lib/profile-compensation";
import type { AnalysisReportCacheEntry } from "@/lib/analysis-report-cache";
import { resolveReportEntry } from "@/lib/sample-analyses";
import { fetchUserProfile } from "@/lib/profile";
import {
  resolveReportPreferredCompanyTypes,
  resolveReportPreferredMinimumEmployerRating,
} from "@/lib/report-profile-prefs";
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
  const [profileQualifiedSkills, setProfileQualifiedSkills] = useState<
    string[]
  >([]);
  const [profileCountry, setProfileCountry] = useState<string | null>(null);
  const [profileTimezone, setProfileTimezone] = useState<string | null>(null);
  const [profilePreferredCompanyTypes, setProfilePreferredCompanyTypes] =
    useState<string[]>([]);
  const [profilePreferredMinimumEmployerRating, setProfilePreferredMinimumEmployerRating] =
    useState<number | null>(null);

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
      fetchProfileQualifiedSkills(),
      fetchProfileCountry(),
      fetchProfileTimezone(),
      fetchUserProfile(),
    ]).then(([pay, industries, skills, country, timezone, profile]) => {
      setProfileDesiredCompensation(pay);
      setProfileQualifiedIndustries(industries);
      setProfileQualifiedSkills(skills);
      setProfileCountry(country);
      setProfileTimezone(timezone);
      if (profile) {
        setProfilePreferredCompanyTypes(profile.preferredCompanyTypes);
        setProfilePreferredMinimumEmployerRating(
          profile.preferredMinimumEmployerRating,
        );
      }
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

  const resolvedCompanyTypes = resolveReportPreferredCompanyTypes(
    profilePreferredCompanyTypes,
    entry,
  );
  const resolvedMinRating = resolveReportPreferredMinimumEmployerRating(
    profilePreferredMinimumEmployerRating,
    entry,
  );

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
          profileQualifiedSkills={
            entry.profileQualifiedSkills ?? profileQualifiedSkills
          }
          profileCountry={entry.profileCountry ?? profileCountry}
          profileTimezone={entry.profileTimezone ?? profileTimezone}
          profilePreferredCompanyTypes={resolvedCompanyTypes}
          profilePreferredMinimumEmployerRating={resolvedMinRating}
        />
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
