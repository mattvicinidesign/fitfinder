"use client";

import { Button } from "@/components/ui/button";
import { SCREEN_REGULAR_CTA_CLASS } from "@/components/resume-upload-styles";
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
  animate = false,
  animateDelay = 0,
}: {
  category: ResumeReviewCategory;
  optimization: AtsKeywordOptimization | null;
  onOptimizeKeywords: () => void;
  onPreviewChanges: () => void;
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
        <Button
          type="button"
          className={SCREEN_REGULAR_CTA_CLASS}
          onClick={onOptimizeKeywords}
        >
          Optimize
          <span className="ml-1.5 rounded-full border border-primary-foreground/25 bg-primary-foreground/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider">
            Beta
          </span>
        </Button>
      </ScoreAccessoryWrap>
    );
  } else if (showImprovementBadge) {
    scoreAccessory = (
      <span className="inline-flex h-7 shrink-0 items-center justify-center rounded-full bg-primary px-2.5 text-[11px] font-semibold text-primary-foreground">
        +{optimization!.improvementPercentage}%
      </span>
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
              className={SCREEN_REGULAR_CTA_CLASS}
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
