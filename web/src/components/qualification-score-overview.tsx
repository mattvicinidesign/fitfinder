"use client";

import { QualificationScoreCircle } from "@/components/qualification-score-circle";
import { SummarySectionCard } from "@/components/summary-section-card";
import { Progress, ProgressIndicator, ProgressTrack } from "@/components/ui/progress";
import {
  computeReportSectionRollups,
  computeWeightedReportScore,
} from "@/lib/section-score-rollups";
import { recommendFromFitScore } from "@/lib/recommendation-bands";
import {
  scoreColor,
  scoreProgressClass,
  scoreProgressTrackClass,
} from "@/lib/score";
import type { ScoreResult } from "@/lib/types";
import { cn } from "@/lib/utils";

function SectionRollupRow({
  title,
  score,
}: {
  title: string;
  score: number | null;
}) {
  const hasScore = score != null;
  const pct = hasScore ? Math.round(score) : 0;

  return (
    <div className="space-y-1.5 min-w-0">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-[Georgia,'Times_New_Roman',serif] text-[14px] text-foreground leading-snug">
          {title}
        </span>
        <span
          className={cn(
            "text-[14px] font-medium tabular-nums shrink-0",
            hasScore ? scoreColor(pct) : "text-muted-foreground",
          )}
        >
          {hasScore ? `${pct}%` : "—"}
        </span>
      </div>
      <Progress value={hasScore ? pct : 0} className="w-full gap-0">
        <ProgressTrack
          className={cn(
            "h-0.5",
            hasScore ? scoreProgressTrackClass(pct) : "bg-muted/50",
          )}
        >
          <ProgressIndicator
            className={hasScore ? scoreProgressClass(pct) : "bg-muted-foreground/30"}
          />
        </ProgressTrack>
      </Progress>
    </div>
  );
}

/** Dual-column header: section rollups (left) and grand fit score ring (right). */
export function QualificationScoreOverview({
  score,
}: {
  score: ScoreResult;
}) {
  const isGuest = score.scoringMode === "guest";
  const rollups = computeReportSectionRollups(score.categoryBreakdown, isGuest);
  const reportFitScore =
    computeWeightedReportScore(score.categoryBreakdown, isGuest) ??
    score.fitScore;
  const { recommendation, label: recommendationLabel } =
    recommendFromFitScore(reportFitScore);

  return (
    <SummarySectionCard title="Score Summary">
      <div
        className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:items-center pt-0.5"
        role="region"
        aria-label="Score summary"
      >
        <div className="space-y-3 min-w-0">
          {rollups.map((section) => (
            <SectionRollupRow
              key={section.id}
              title={section.title}
              score={section.score}
            />
          ))}
        </div>
        <div className="flex justify-center sm:justify-center">
          <QualificationScoreCircle
            fitScore={reportFitScore}
            recommendationLabel={recommendationLabel}
            recommendation={recommendation}
            size="large"
          />
        </div>
      </div>
    </SummarySectionCard>
  );
}
