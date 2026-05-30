"use client";

import { SummaryFieldLabel } from "@/components/summary-field-label";
import { SummaryMatchBadge } from "@/components/summary-match-badge";
import { buildIndustryDetail } from "@/lib/industry-match";
import type { SummaryMatchState } from "@/lib/summary-criteria";
import type { CategoryScore, ParsedJob, ParsedResume } from "@/lib/types";

/** Industry pills for the summary card (match = green, no match = rose). */
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
          {postingIndustries.map((m) => {
            const state: SummaryMatchState =
              m.strongMatch ? "match" : "mismatch";
            return (
              <SummaryMatchBadge
                key={m.jobIndustry}
                label={m.jobIndustry}
                state={state}
              />
            );
          })}
        </div>
      ) : isUnknown ? (
        <SummaryMatchBadge label="—" state="unknown" />
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
