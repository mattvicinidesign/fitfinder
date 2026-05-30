"use client";

import { BreakdownAccordion } from "@/components/breakdown-accordion";
import { BreakdownMatchSections } from "@/components/breakdown-match-sections";
import { Progress, ProgressIndicator, ProgressTrack } from "@/components/ui/progress";
import { buildSoftwareModelDetail } from "@/lib/software-model-match";
import { scoreColor, scoreProgressClass } from "@/lib/score";
import type { CategoryScore, ParsedJob, ParsedResume } from "@/lib/types";
import { cn } from "@/lib/utils";

export function SoftwareModelBreakdownRow({
  label,
  category,
  parsedJob,
  parsedResume,
}: {
  label: string;
  category?: CategoryScore;
  parsedJob?: ParsedJob;
  parsedResume?: ParsedResume | null;
}) {
  const detail = buildSoftwareModelDetail(parsedJob, parsedResume);
  const pct =
    category && category.status !== "unknown"
      ? Math.round(category.score)
      : detail && detail.items.length > 0
        ? Math.round((detail.matched.length / detail.items.length) * 100)
        : null;
  const showScore = pct != null;

  const summary = (
    <>
      <div className="flex items-center justify-between gap-4">
        <span className="text-[15px] flex-1 min-w-0">{label}</span>
        <span
          className={cn(
            "text-[15px] font-medium tabular-nums",
            showScore ? scoreColor(pct) : "text-muted-foreground",
          )}
        >
          {showScore ? `${pct}%` : "Unknown"}
        </span>
      </div>
      {showScore && pct != null ? (
        <Progress value={pct} className="w-full gap-0">
          <ProgressTrack className="h-1.5">
            <ProgressIndicator className={scoreProgressClass(pct)} />
          </ProgressTrack>
        </Progress>
      ) : null}
      <p className="text-[12px] text-muted-foreground leading-snug">
        {detail
          ? `${detail.matched.length} of ${detail.items.length} software models in the posting matched your resume`
          : "No software models parsed from the posting — Unknown."}
      </p>
    </>
  );

  if (!detail) {
    return <div className="py-3 border-b border-border/80 space-y-2">{summary}</div>;
  }

  return (
    <BreakdownAccordion
      summary={summary}
      ariaLabel="Software model breakdown"
      expandHint="software models"
    >
      <BreakdownMatchSections
        matched={detail.matched.map((i) => ({
          label: i.label,
          resumeMatch: i.resumeMatch ?? undefined,
        }))}
        missing={detail.missing.map((i) => ({ label: i.label }))}
      />
    </BreakdownAccordion>
  );
}
