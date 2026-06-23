"use client";

import { AiGradientPillButton, AiGradientPillBadge } from "@/components/ai-gradient-pill-button";
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
import { ATS_OPTIMIZED_CATEGORY_EXPLANATION } from "@/lib/patch-resume-review-ats-score";
import type { AtsKeywordOptimization, ResumeReviewCategory } from "@/lib/types";
import type { MouseEvent, ReactNode } from "react";

function ScoreAccessoryWrap({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={className}
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
  onReviewApplied,
  animate = false,
  animateDelay = 0,
}: {
  category: ResumeReviewCategory;
  optimization: AtsKeywordOptimization | null;
  onOptimizeKeywords: () => void;
  onPreviewChanges: () => void;
  onReviewApplied?: () => void;
  animate?: boolean;
  animateDelay?: number;
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
  let afterLabel: ReactNode;
  if (showOptimizeButton) {
    afterLabel = (
      <ScoreAccessoryWrap className="w-full min-w-0">
        <AiGradientPillButton
          onClick={onOptimizeKeywords}
          showIcon={false}
          badge="Beta"
        >
          Optimize
        </AiGradientPillButton>
      </ScoreAccessoryWrap>
    );
  } else if (showImprovementBadge) {
    scoreAccessory = (
      <AiGradientPillBadge>
        +{optimization!.improvementPercentage}%
      </AiGradientPillBadge>
    );
  }

  return (
    <ResumeReviewCategoryScoreCard
      categoryKey="ats"
      href="/resume-review/ats"
      ariaLabel={`${label}, ${scoreLabel}. ${category.explanation}`}
      score={displayScore}
      animate={animate}
      animateDelay={animateDelay}
      label={label}
      explanation={
        showOptimizeButton
          ? undefined
          : isApplied
            ? ATS_OPTIMIZED_CATEGORY_EXPLANATION
            : category.explanation
      }
      scoreAccessory={scoreAccessory}
      afterLabel={afterLabel}
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
        ) : isApplied ? (
          <div className={layout.footer}>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="w-full"
              onClick={onReviewApplied}
            >
              Review replacements
            </Button>
          </div>
        ) : undefined
      }
    />
  );
}
