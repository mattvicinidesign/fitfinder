"use client";

import { ReportJobTitleMeta } from "@/components/report-job-title-meta";
import type {
  Compensation,
  ParsedJob,
  ParsedResume,
  PostingContext,
  ScoreResult,
} from "@/lib/types";

export function ReportSummaryHeader({
  jobTitle,
  score,
  parsedJob,
  parsedResume,
  profileDesiredCompensation,
  profileQualifiedIndustries,
  profileQualifiedSkills,
  profileCountry,
  profileTimezone,
  profilePreferredCompanyTypes,
  profilePreferredMinimumEmployerRating,
  profilePreferredRegions,
  profilePreferredProjectTypes,
  profileMinimumHourlyRate,
  jobDescription,
  companyName,
  postingContext,
}: {
  jobTitle: string;
  score: ScoreResult;
  parsedJob?: ParsedJob;
  parsedResume?: ParsedResume | null;
  profileDesiredCompensation?: Compensation | null;
  profileQualifiedIndustries?: string[] | null;
  profileQualifiedSkills?: string[] | null;
  profileCountry?: string | null;
  profileTimezone?: string | null;
  profilePreferredCompanyTypes?: string[] | null;
  profilePreferredMinimumEmployerRating?: number | null;
  profilePreferredRegions?: string[] | null;
  profilePreferredProjectTypes?: string[] | null;
  profileMinimumHourlyRate?: number | null;
  jobDescription?: string | null;
  companyName?: string | null;
  postingContext?: PostingContext | null;
}) {
  return (
    <div className="space-y-2 pt-2">
      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        Job Fit Report Summary
      </p>
      <p className="text-[22px] font-semibold leading-tight tracking-tight text-foreground">
        {jobTitle}
      </p>
      <ReportJobTitleMeta
        score={score}
        parsedJob={parsedJob}
        parsedResume={parsedResume}
        profileDesiredCompensation={profileDesiredCompensation}
        profileQualifiedIndustries={profileQualifiedIndustries}
        profileQualifiedSkills={profileQualifiedSkills}
        profileCountry={profileCountry}
        profileTimezone={profileTimezone}
        profilePreferredCompanyTypes={profilePreferredCompanyTypes}
        profilePreferredMinimumEmployerRating={profilePreferredMinimumEmployerRating}
        profilePreferredRegions={profilePreferredRegions}
        profilePreferredProjectTypes={profilePreferredProjectTypes}
        profileMinimumHourlyRate={profileMinimumHourlyRate}
        jobDescription={jobDescription}
        jobTitle={jobTitle}
        companyName={companyName}
        postingContext={postingContext}
      />
    </div>
  );
}
