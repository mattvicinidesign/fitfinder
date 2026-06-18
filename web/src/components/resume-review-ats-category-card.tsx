"use client";

import { AiGradientPillButton } from "@/components/ai-gradient-pill-button";
import { Button } from "@/components/ui/button";
import {
  formatResumeReviewScorePercent,
  ResumeReviewCategoryScoreCard,
  resumeReviewCategoryCardLayout,
} from "@/components/resume-review-ui";
import { getResumeReviewCategoryLabel } from "@/lib/resume-review-categories";
import {
  isAtsOptimizationApplied,
  isAtsScanPendingReview,
} from "@/lib/resume-review-ats-optimization";
import type { AtsKeywordOptimization, ResumeReviewCategory } from "@/lib/types";
import type { MouseEvent, ReactNode } from "react";

function ScoreAccessoryWrap({ children }: { children: ReactNode }) {
  return (
    <div
      onClick={(event: MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onKeyDown={(event) => event.stopPropagation()}
    >
      {children}
    </div>
  );
}

export function ResumeReviewAtsCategoryCard({
  category,
  optimization,
  onOptimizeKeywords,
  onPreviewChanges,
}: {
  category: ResumeReviewCategory;
  optimization: AtsKeywordOptimization | null;
  onOptimizeKeywords: () => void;
  onPreviewChanges: () => void;
}) {
  const label = getResumeReviewCategoryLabel("ats");
  const isApplied = isAtsOptimizationApplied(optimization);
  const isPendingReview = isAtsScanPendingReview(optimization);
  const displayScore = isApplied
    ? optimization!.optimizedATSScore
    : category.score;
  const scoreLabel = formatResumeReviewScorePercent(displayScore);
  const showImprovementBadge =
    isApplied &&
    !optimization!.improvementDismissed &&
    optimization!.improvementPercentage > 0;
  const showOptimizeButton = !isApplied && !isPendingReview;
  const layout = resumeReviewCategoryCardLayout;

  let scoreAccessory: ReactNode;
  if (showOptimizeButton) {
    scoreAccessory = (
      <ScoreAccessoryWrap>
        <AiGradientPillButton compact onClick={onOptimizeKeywords}>
          Optimize
        </AiGradientPillButton>
      </ScoreAccessoryWrap>
    );
  } else if (showImprovementBadge) {
    scoreAccessory = (
      <span className="inline-flex h-7 shrink-0 items-center rounded-full bg-emerald-500/15 px-2.5 text-[11px] font-semibold whitespace-nowrap text-emerald-400">
        +{optimization!.improvementPercentage}% Increase
      </span>
    );
  }

  return (
    <ResumeReviewCategoryScoreCard
      categoryKey="ats"
      href="/resume-review/ats"
      ariaLabel={`${label}, ${scoreLabel}. ${category.explanation}`}
      scoreLabel={scoreLabel}
      label={label}
      explanation={category.explanation}
      scoreAccessory={scoreAccessory}
      footer={
        isPendingReview ? (
          <div className={layout.footer}>
            <Button
              type="button"
              size="sm"
              className="w-full"
              onClick={onPreviewChanges}
            >
              Review changes
            </Button>
          </div>
        ) : undefined
      }
    />
  );
}
