"use client";

import { SummaryFieldLabel } from "@/components/summary-field-label";
import { SummaryInfoBadge } from "@/components/summary-info-badge";
import { SummaryMatchBadge } from "@/components/summary-match-badge";
import { NOT_SPECIFIED_LABEL } from "@/lib/not-specified";
import { buildIndustryDetail } from "@/lib/industry-match";
import type { CategoryScore, ParsedJob, ParsedResume } from "@/lib/types";

/** Industry scoring item pills (match = primary, no match = neutral). */
export function IndustrySummaryContent({
  label,
  category,
  parsedJob,
  parsedResume,
  profileQualifiedIndustries,
}: {
  label: string;
  category: CategoryScore;
  parsedJob?: ParsedJob;
  parsedResume?: ParsedResume | null;
  profileQualifiedIndustries?: string[] | null;
}) {
  const detail = parsedJob
    ? buildIndustryDetail(parsedJob, parsedResume, profileQualifiedIndustries)
    : null;

  const isUnknown = category.status === "unknown";
  const postingIndustries = detail?.matches ?? [];

  return (
    <div className="space-y-1.5">
      <SummaryFieldLabel>{label}</SummaryFieldLabel>
      {postingIndustries.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {postingIndustries.map((m) =>
            m.strongMatch ? (
              <SummaryInfoBadge
                key={m.jobIndustry}
                label={m.jobIndustry}
                positive
              />
            ) : (
              <SummaryMatchBadge
                key={m.jobIndustry}
                label={m.jobIndustry}
                state="mismatch"
              />
            ),
          )}
        </div>
      ) : isUnknown ? (
        <span className="text-[11px] font-medium text-muted-foreground">
          {NOT_SPECIFIED_LABEL}
        </span>
      ) : detail && detail.resumeIndustries.length > 0 ? (
        <p className="text-[11px] text-muted-foreground leading-snug">
          No industries in posting. Resume: {detail.resumeIndustries.join(", ")}.
        </p>
      ) : (
        <p className="text-[11px] text-muted-foreground leading-snug">
          No industries detected.
        </p>
      )}
    </div>
  );
}
