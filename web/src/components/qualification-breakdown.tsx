"use client";

import { QualificationScoreOverview } from "@/components/qualification-score-overview";
import { ReportRevealSection } from "@/components/report-reveal-section";
import { SemanticMatchReportSections } from "@/components/semantic-match-report";
import { buildReportRollupOptions } from "@/lib/report-rollup-context";
import { getSemanticReport } from "@/lib/semantic-report";
import type {
  Compensation,
  Narrative,
  ParsedJob,
  ParsedResume,
  PostingContext,
  ScoreResult,
} from "@/lib/types";

export function QualificationBreakdown({
  score,
  postingContext,
  parsedJob,
  parsedResume,
  jobDescription,
  jobTitle: analysisJobTitle,
  companyName,
  narrative,
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
}: {
  score: ScoreResult;
  postingContext?: PostingContext | null;
  parsedJob?: ParsedJob;
  parsedResume?: ParsedResume | null;
  jobDescription?: string | null;
  jobTitle?: string | null;
  companyName?: string | null;
  narrative?: Narrative;
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
}) {
  const rollupOptions = buildReportRollupOptions({
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
    jobTitle: analysisJobTitle,
    companyName,
    postingContext,
  });

  const semanticReport = getSemanticReport(score);

  return (
    <div className="w-full space-y-3">
      <ReportRevealSection>
        <QualificationScoreOverview score={score} rollupOptions={rollupOptions} />
      </ReportRevealSection>

      {semanticReport ? (
        <SemanticMatchReportSections
          report={semanticReport}
          narrative={narrative}
        />
      ) : (
        <p className="text-[14px] text-muted-foreground px-1">
          Detailed semantic breakdown is unavailable for this report.
        </p>
      )}
    </div>
  );
}
