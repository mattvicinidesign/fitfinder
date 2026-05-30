"use client";

import { BreakdownAccordion } from "@/components/breakdown-accordion";
import { BreakdownMatchSections } from "@/components/breakdown-match-sections";
import { Progress, ProgressIndicator, ProgressTrack } from "@/components/ui/progress";
import { buildAiEmphasisDetail } from "@/lib/ai-emphasis-match";
import { scoreColor, scoreProgressClass } from "@/lib/score";
import type { CategoryScore, ParsedJob, ParsedResume } from "@/lib/types";
import { cn } from "@/lib/utils";

export function AiEmphasisBreakdownRow({
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
  const detail = buildAiEmphasisDetail(parsedJob, parsedResume);
  const pct =
    category && category.status !== "unknown" ? Math.round(category.score) : null;
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
        {detail?.summary ??
          "No AI requirements parsed from the posting — this category stays Unknown."}
      </p>
    </>
  );

  if (!detail) {
    return <div className="py-3 border-b border-border/80 space-y-2">{summary}</div>;
  }

  const inPostingLabel =
    detail.jobRequirements.length > 0
      ? detail.jobRequirements.join(", ")
      : detail.jobMaturity != null
        ? `AI maturity ~${detail.jobMaturity}% (inferred)`
        : "No explicit AI signals parsed";

  return (
    <BreakdownAccordion
      summary={summary}
      ariaLabel="AI emphasis breakdown"
      expandHint="AI requirements"
    >
      <div className="space-y-3 text-[13px] leading-snug">
        <BreakdownMatchSections
          matched={detail.matched.map((i) => ({
            label: i.label,
            resumeMatch: i.resumeMatch ?? undefined,
          }))}
          missing={detail.missing.map((i) => ({ label: i.label }))}
          inPostingContext={
            <>
              <p className="text-[15px] font-medium text-foreground leading-snug">
                {inPostingLabel}
              </p>
              {detail.jobMaturity != null ? (
                <p className="text-[11px] text-muted-foreground">
                  Posting AI maturity score: {detail.jobMaturity}%
                </p>
              ) : null}
            </>
          }
        />

        {detail.resumeMaturity != null ? (
          <div className="space-y-1 border-t border-border/60 pt-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Your AI signals
            </p>
            <p className="text-[15px] font-medium text-foreground">
              Maturity ~{detail.resumeMaturity}% (from resume parse)
            </p>
          </div>
        ) : null}

        <p className="text-[11px] text-muted-foreground border-t border-border/60 pt-2">
          Overall score also compares posting vs resume AI maturity levels (45%+ = match). Listed
          requirements use text overlap on resume AI experience, skills, and tools.
        </p>
      </div>
    </BreakdownAccordion>
  );
}
