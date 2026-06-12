"use client";

import { SummaryFieldLabel } from "@/components/summary-field-label";
import { SummaryMatchBadge } from "@/components/summary-match-badge";
import {
  coverageDetailForCategory,
  type CoverageCategoryKey,
  type CoverageResult,
} from "@/lib/coverage-detail";
import { scoreColor } from "@/lib/score";
import type { CategoryScore, ParsedJob, ParsedResume } from "@/lib/types";
import { cn } from "@/lib/utils";

export function QualificationCoveragePillsRow({
  label,
  category,
  coverageKey,
  parsedJob,
  parsedResume,
  jobDescription,
  profileQualifiedSkills,
}: {
  label: string;
  category: CategoryScore;
  coverageKey: CoverageCategoryKey;
  parsedJob?: ParsedJob;
  parsedResume?: ParsedResume | null;
  jobDescription?: string | null;
  profileQualifiedSkills?: string[] | null;
}) {
  const computed: CoverageResult | null = parsedJob
    ? coverageDetailForCategory(
        coverageKey,
        parsedJob,
        parsedResume,
        jobDescription,
        coverageKey === "skills" ? profileQualifiedSkills : undefined,
      )
    : null;

  const detail =
    computed?.items?.length
      ? computed.items
      : category.matchDetail?.length
        ? category.matchDetail
        : [];

  const total = category.totalCount ?? detail.length;
  const matched =
    category.matchedCount ?? detail.filter((i) => i.matched).length;
  const ratioText = total > 0 ? `${matched}/${total}` : null;
  const pct =
    total > 0
      ? Math.round((matched / total) * 100)
      : Math.round(category.score);

  return (
    <div className="space-y-1.5 min-w-0">
      <div className="flex items-baseline justify-between gap-3">
        <SummaryFieldLabel>{label}</SummaryFieldLabel>
        {ratioText ? (
          <span
            className={cn(
              "text-[14px] font-semibold tabular-nums shrink-0",
              scoreColor(pct),
            )}
          >
            {ratioText}
          </span>
        ) : null}
      </div>
      {detail.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {detail.map((item) => (
            <SummaryMatchBadge
              key={item.label}
              label={item.label}
              state={item.matched ? "match" : "mismatch"}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
