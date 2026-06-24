"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ReportBackButton } from "@/components/report-back-button";
import { useSearchParams } from "next/navigation";
import { AnalysisResultView } from "@/components/analysis-result";
import { ApplicationAssistantSection } from "@/components/application-assistant-section";
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
import { loadLocalProfilePrefs } from "@/lib/local-profile-prefs";
import {
  resolveReportPreferredCompanyTypes,
  resolveReportPreferredMinimumEmployerRating,
  resolveReportPreferredProjectTypes,
  resolveReportPreferredRegions,
  resolveReportMinimumHourlyRate,
} from "@/lib/report-profile-prefs";
import type { Compensation } from "@/lib/types";
import { normalizeAnalysisResult } from "@/lib/normalize-score";
import { reportRoleTitle } from "@/lib/analysis-report-cache";
import { cn } from "@/lib/utils";
import { SkeletonAnalysisReport } from "@/components/ui/skeletons";
import { ReportSummaryHeader } from "@/components/report-summary-header";
import {
  screenShellClass,
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
    useState<string[]>(() => loadLocalProfilePrefs()?.preferredCompanyTypes ?? []);
  const [profilePreferredMinimumEmployerRating, setProfilePreferredMinimumEmployerRating] =
    useState<number | null>(
      () => loadLocalProfilePrefs()?.preferredMinimumEmployerRating ?? null,
    );
  const [profilePreferredRegions, setProfilePreferredRegions] = useState<string[]>(
    () => loadLocalProfilePrefs()?.preferredRegions ?? [],
  );
  const [profilePreferredProjectTypes, setProfilePreferredProjectTypes] =
    useState<string[]>(() => loadLocalProfilePrefs()?.preferredProjectTypes ?? []);
  const [profileMinimumHourlyRate, setProfileMinimumHourlyRate] = useState<number | null>(
    () => loadLocalProfilePrefs()?.minimumHourlyRate ?? null,
  );

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
        setProfilePreferredRegions(profile.preferredRegions);
        setProfilePreferredProjectTypes(profile.preferredProjectTypes);
        setProfileMinimumHourlyRate(profile.minimumHourlyRate);
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
  const resolvedRegions = resolveReportPreferredRegions(
    profilePreferredRegions,
    entry,
  );
  const resolvedProjectTypes = resolveReportPreferredProjectTypes(
    profilePreferredProjectTypes,
    entry,
  );
  const resolvedMinimumHourlyRate = resolveReportMinimumHourlyRate(
    profileMinimumHourlyRate,
    entry,
  );

  const profileDesired =
    entry.profileDesiredCompensation ?? profileDesiredCompensation;
  const profileIndustries =
    entry.profileQualifiedIndustries ?? profileQualifiedIndustries;
  const profileSkills = entry.profileQualifiedSkills ?? profileQualifiedSkills;
  const profileCountryResolved = entry.profileCountry ?? profileCountry;
  const profileTimezoneResolved = entry.profileTimezone ?? profileTimezone;

  const normalized = normalizeAnalysisResult(entry.result, {
    profileDesiredCompensation: profileDesired,
    profileQualifiedIndustries: profileIndustries,
    profileQualifiedSkills: profileSkills,
    profileCountry: profileCountryResolved,
    profileTimezone: profileTimezoneResolved,
  });
  const jobDescription =
    normalized.jobDescription ?? entry.result.jobDescription ?? null;
  const displayJobTitle = reportRoleTitle({
    ...entry.result,
    jobDescription,
    parsedJob: normalized.parsedJob,
  });

  return (
    <ReportShell
      header={
        <ReportSummaryHeader
          jobTitle={displayJobTitle}
          score={normalized.score}
          parsedJob={normalized.parsedJob}
          parsedResume={normalized.parsedResume}
          profileDesiredCompensation={profileDesired}
          profileQualifiedIndustries={profileIndustries}
          profileQualifiedSkills={profileSkills}
          profileCountry={profileCountryResolved}
          profileTimezone={profileTimezoneResolved}
          profilePreferredCompanyTypes={resolvedCompanyTypes}
          profilePreferredMinimumEmployerRating={resolvedMinRating}
          profilePreferredRegions={resolvedRegions}
          profilePreferredProjectTypes={resolvedProjectTypes}
          profileMinimumHourlyRate={resolvedMinimumHourlyRate}
          jobDescription={jobDescription}
          companyName={entry.result.companyName}
          postingContext={normalized.postingContext}
        />
      }
      footer={
        <ApplicationAssistantSection
          reportId={reportId}
          resumeId={entry.resumeId ?? null}
          parsedJob={normalized.parsedJob}
          parsedResume={normalized.parsedResume}
          narrative={entry.result.narrative}
          jobDescription={jobDescription}
          jobTitle={displayJobTitle}
          companyName={entry.result.companyName}
        />
      }
    >
      <div className="pb-6">
        <AnalysisResultView
          result={entry.result}
          analysisId={entry.analysisId}
          reportId={reportId}
          resumeId={entry.resumeId ?? null}
          showSummaryHeader={false}
          profileDesiredCompensation={profileDesired}
          profileQualifiedIndustries={profileIndustries}
          profileQualifiedSkills={profileSkills}
          profileCountry={profileCountryResolved}
          profileTimezone={profileTimezoneResolved}
          profilePreferredCompanyTypes={resolvedCompanyTypes}
          profilePreferredMinimumEmployerRating={resolvedMinRating}
          profilePreferredRegions={resolvedRegions}
          profilePreferredProjectTypes={resolvedProjectTypes}
          profileMinimumHourlyRate={resolvedMinimumHourlyRate}
        />
      </div>
    </ReportShell>
  );
}

function ReportShell({
  children,
  header,
  footer,
}: {
  children: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className={screenShellClass}>
      <StickyScreenHeader
        className={cn(
          "border-b border-border/50 bg-background/95 px-4 pb-3 backdrop-blur-md",
          safeTopCompact,
        )}
      >
        <ReportBackButton />
        {header}
      </StickyScreenHeader>
      <StickyScreenBody
        className={cn(screenGutterX, footer ? "pb-24" : undefined)}
      >
        {children}
      </StickyScreenBody>
      {footer}
    </div>
  );
}
