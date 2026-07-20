"use client";

import { AnimatedScoreProgress } from "@/components/animated-score-progress";
import { QualificationScoreCircle } from "@/components/qualification-score-circle";
import { SummarySectionCard } from "@/components/summary-section-card";
import { resolveReportFitScore } from "@/lib/report-fit-score";
import { recommendFromFitScore } from "@/lib/recommendation-bands";
import {
  buildSemanticCategoryRollups,
  getSemanticReport,
  GLOBAL_SEMANTIC_SCORE_INFO,
} from "@/lib/semantic-report";
import {
  GLOBAL_SCORE_LABEL,
} from "@/lib/scoring-terminology";
import {
  scoreColor,
  scoreProgressClass,
  SCORE_PROGRESS_BAR_HEIGHT_CLASS,
  SCORE_PROGRESS_TRACK_CLASS,
} from "@/lib/score";
import {
  formatScoreOnTen,
  useAnimatedNumber,
} from "@/lib/use-score-reveal";
import type { ReportRollupOptions } from "@/lib/section-score-rollups";
import type { ScoreResult } from "@/lib/types";
import { cn } from "@/lib/utils";

function ScoringCategoryRollupRow({
  title,
  score,
  weight,
  animateDelay = 0,
}: {
  title: string;
  score: number | null;
  weight?: number;
  animateDelay?: number;
}) {
  const hasScore = score != null;
  const pct = hasScore ? Math.round(score) : 0;
  const scoreOnTen = hasScore ? score / 10 : 0;
  const animatedScoreOnTen = useAnimatedNumber(scoreOnTen, {
    disabled: !hasScore,
    delay: animateDelay,
  });
  const valueText = hasScore ? formatScoreOnTen(animatedScoreOnTen) : "—";

  return (
    <div className="space-y-1.5 min-w-0">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[14px] font-medium text-foreground leading-snug">
          {title}
          {weight != null ? (
            <span className="text-muted-foreground font-normal"> ({weight}%)</span>
          ) : null}
        </span>
        <span
          className={cn(
            "text-[14px] font-semibold tabular-nums shrink-0",
            hasScore ? scoreColor(pct) : "text-muted-foreground",
          )}
        >
          {valueText}
        </span>
      </div>
      <AnimatedScoreProgress
        value={hasScore ? pct : 0}
        delay={animateDelay}
        trackClassName={cn(
          SCORE_PROGRESS_BAR_HEIGHT_CLASS,
          SCORE_PROGRESS_TRACK_CLASS,
        )}
        indicatorClassName={hasScore ? scoreProgressClass(pct) : "bg-transparent"}
      />
    </div>
  );
}

/** Global score card: semantic category rollups (left) and 0–10 ring (right). */
export function QualificationScoreOverview({
  score,
  rollupOptions,
}: {
  score: ScoreResult;
  rollupOptions: ReportRollupOptions;
}) {
  const report = getSemanticReport(score);
  const rollups = report
    ? buildSemanticCategoryRollups(report)
    : [];
  const reportFitScore = resolveReportFitScore(score, rollupOptions);

  const { recommendation, label: recommendationLabel } =
    recommendFromFitScore(reportFitScore);

  return (
    <SummarySectionCard
      title={GLOBAL_SCORE_LABEL}
      info={GLOBAL_SEMANTIC_SCORE_INFO}
    >
      <div
        className="grid grid-cols-[1fr_auto] gap-4 items-start pt-0.5 min-w-0"
        role="region"
        aria-label={GLOBAL_SCORE_LABEL}
      >
        <div
          className="flex flex-col gap-3 min-w-0"
          role="list"
          aria-label="Scoring categories"
        >
          {rollups.map((section, index) => (
            <ScoringCategoryRollupRow
              key={section.id}
              title={section.title}
              score={section.score}
              weight={section.weight}
              animateDelay={index * 60}
            />
          ))}
        </div>
        <div className="flex justify-end shrink-0 min-w-0 pt-1">
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
