"use client";

import { buildReportRollupOptions } from "@/lib/report-rollup-context";
import { buildClientProfileFields } from "@/lib/section-field-scoring";
import type {
  Compensation,
  ParsedJob,
  ParsedResume,
  PostingContext,
  ScoreResult,
} from "@/lib/types";

function fieldByKey<T extends { key: string }>(
  fields: T[],
  key: string,
): T | undefined {
  return fields.find((f) => f.key === key);
}

/** e.g. "Upwork | 4 Weeks Ago | Worldwide" */
export function buildReportTitleSubtext(
  fields: ReturnType<typeof buildClientProfileFields>,
): string | null {
  const platform = fieldByKey(fields, "platform");
  const posted = fieldByKey(fields, "datePosted");
  const availability = fieldByKey(fields, "hireArea");

  const segments: string[] = [];
  if (platform?.identified) {
    segments.push(platform.badgeLabel);
  }
  if (posted?.identified) {
    segments.push(posted.badgeLabel);
  }
  if (availability?.identified) {
    segments.push(availability.badgeLabel);
  }

  return segments.length > 0 ? segments.join(" | ") : null;
}

/** Posted, availability, and platform line under the job title on fit reports. */
export function ReportJobTitleMeta({
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
  jobDescription,
  jobTitle,
  companyName,
  postingContext,
}: {
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
  jobDescription?: string | null;
  jobTitle?: string | null;
  companyName?: string | null;
  postingContext?: PostingContext | null;
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
    jobDescription,
    jobTitle,
    companyName,
    postingContext,
  });

  const clientFields = buildClientProfileFields(
    rollupOptions.fieldContext,
    rollupOptions.postingRows,
    rollupOptions.highlightCtx,
  );

  const subtext = buildReportTitleSubtext(clientFields);
  if (!subtext) return null;

  return (
    <p className="text-[14px] leading-snug text-muted-foreground">{subtext}</p>
  );
}
