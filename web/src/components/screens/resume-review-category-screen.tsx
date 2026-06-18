"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { toast } from "sonner";
import { useResumeReviewCategorySheetClose } from "@/components/app-shell/resume-review-category-sheet-context";
import { AtsKeywordPreviewDrawer } from "@/components/ats-keyword-preview-drawer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  FindingRow,
  formatResumeReviewScorePercent,
  ScoreProgressBar,
  sortResumeReviewFindings,
} from "@/components/resume-review-ui";
import { ResumeReviewResourcesSection } from "@/components/resume-review-resources-section";
import { safeBottomOverlay } from "@/lib/safe-area";
import {
  applyAtsKeywordOptimization,
  clearAtsKeywordOptimization,
  downloadOptimizedResume,
  isAtsOptimizationApplied,
  isAtsScanPendingReview,
  loadAtsKeywordOptimization,
} from "@/lib/resume-review-ats-optimization";
import {
  getResumeReviewCategory,
  getResumeReviewCategoryLabel,
  getResumeReviewImprovementForCategory,
  isResumeReviewCategoryKey,
} from "@/lib/resume-review-categories";
import { loadResumeReview, saveResumeReview } from "@/lib/resume-review-cache";
import { patchResumeReviewAtsScore } from "@/lib/patch-resume-review-ats-score";
import { goBackToResumeReview } from "@/lib/navigate-app";
import { resumeReviewScoreTextClass } from "@/lib/resume-review-score-colors";
import type { AtsKeywordChangeDecision, AtsKeywordOptimization, ResumeReviewCategoryKey } from "@/lib/types";
import { cn } from "@/lib/utils";

function KeywordChangeRow({ before, after }: { before: string; after: string }) {
  return (
    <li className="text-[15px] leading-snug">
      <span className="text-muted-foreground">{before}</span>
      <span className="mx-1.5 text-muted-foreground">→</span>
      <span className="font-medium text-foreground">{after}</span>
    </li>
  );
}

export function ResumeReviewCategoryScreen({
  categoryKey,
}: {
  categoryKey: string;
}) {
  const router = useRouter();
  const closeCategory = useResumeReviewCategorySheetClose();
  const review = loadResumeReview();
  const validKey = isResumeReviewCategoryKey(categoryKey)
    ? categoryKey
    : null;
  const category =
    review && validKey
      ? getResumeReviewCategory(review, validKey as ResumeReviewCategoryKey)
      : null;
  const improvement =
    review && validKey
      ? getResumeReviewImprovementForCategory(
          review,
          validKey as ResumeReviewCategoryKey,
        )
      : null;
  const reviewId = review?.id ?? null;
  const hasValidCategory = Boolean(review && validKey && category);
  const [optimization, setOptimization] = useState<AtsKeywordOptimization | null>(
    null,
  );
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    if (!reviewId) return;
    setOptimization(loadAtsKeywordOptimization(reviewId));
  }, [reviewId]);

  useEffect(() => {
    if (hasValidCategory) return;
    goBackToResumeReview(router);
  }, [hasValidCategory, router]);

  if (!review || !validKey || !category) {
    return null;
  }

  const isAts = validKey === "ats";
  const atsApplied = isAts && isAtsOptimizationApplied(optimization);
  const atsPendingReview = isAts && isAtsScanPendingReview(optimization);
  const displayScore = atsApplied
    ? optimization!.optimizedATSScore
    : category.score;

  const handleDownload = () => {
    if (!isAtsOptimizationApplied(optimization)) return;
    downloadOptimizedResume(optimization!.optimizedResumeText, "resume");
    toast.success("Optimized resume downloaded.");
  };

  const handleApplyOptimization = (decisions: AtsKeywordChangeDecision[]) => {
    if (!review || !optimization) return;
    const applied = applyAtsKeywordOptimization(review.id, optimization, decisions);
    const patchedReview = patchResumeReviewAtsScore(
      review,
      applied.optimizedATSScore,
    );
    saveResumeReview(patchedReview);
    setOptimization(applied);
    setPreviewOpen(false);
    toast.success("Optimized resume built.");
  };

  const handleDiscardPending = () => {
    if (!review) return;
    clearAtsKeywordOptimization(review.id);
    setOptimization(null);
    setPreviewOpen(false);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="shrink-0 border-b border-border/60 px-4 pb-3 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-[22px] font-bold leading-tight tracking-tight">
              {getResumeReviewCategoryLabel(validKey as ResumeReviewCategoryKey)}
            </h1>
            <p className="mt-1.5 text-[15px] leading-snug text-muted-foreground">
              {category.explanation}
            </p>
          </div>
          <button
            type="button"
            onClick={() => closeCategory?.()}
            aria-label="Close category details"
            className="-mr-1 mt-0.5 inline-flex shrink-0 items-center rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
          >
            <X className="size-5 shrink-0" aria-hidden />
          </button>
        </div>

        {atsApplied ? (
          <div className="mt-3 flex items-center gap-2 text-[14px] tabular-nums text-muted-foreground">
            <span className="line-through">
              {formatResumeReviewScorePercent(optimization!.originalATSScore)}
            </span>
            <span aria-hidden>→</span>
            <span className="font-semibold text-foreground">
              {formatResumeReviewScorePercent(displayScore)}
            </span>
            {!optimization!.improvementDismissed ? (
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[12px] font-semibold text-emerald-400">
                +{optimization!.improvementPercentage}%
              </span>
            ) : null}
          </div>
        ) : null}

        <div className="mt-4">
          <span
            className={cn(
              "text-[34px] font-bold tabular-nums leading-none",
              resumeReviewScoreTextClass(displayScore),
            )}
          >
            {formatResumeReviewScorePercent(displayScore)}
          </span>
        </div>
        <ScoreProgressBar
          score={displayScore}
          label={getResumeReviewCategoryLabel(validKey as ResumeReviewCategoryKey)}
          className="mt-3 h-2"
        />
      </header>

      <div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto overscroll-contain touch-pan-y",
          safeBottomOverlay,
        )}
      >
        <div className="space-y-6 px-4 py-6 pb-8">
          {atsApplied ? (
            <section className="space-y-3">
              <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
                ATS Keyword Optimization Results
              </h2>
              <Card className="gap-0 py-0 ring-border/60">
                <CardContent className="space-y-4 px-4 py-4">
                  <p className="text-[15px] text-foreground">
                    Keywords Improved:{" "}
                    <span className="font-semibold tabular-nums">
                      {optimization!.keywordChangeDecisions?.filter(
                        (decision) => decision === "approved",
                      ).length ?? 0}
                    </span>
                  </p>
                  <div className="space-y-2">
                    <p className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Examples
                    </p>
                    <ul className="space-y-2">
                      {optimization!.keywordChanges
                        .slice(0, 10)
                        .filter(
                          (_, index) =>
                            optimization!.keywordChangeDecisions?.[index] ===
                            "approved",
                        )
                        .slice(0, 10)
                        .map((change, index) => (
                        <KeywordChangeRow
                          key={`${change.before}-${change.after}-${index}`}
                          before={change.before}
                          after={change.after}
                        />
                      ))}
                    </ul>
                  </div>
                  <div className="flex flex-col gap-2 pt-1">
                    <Button type="button" onClick={handleDownload}>
                      Download Optimized Resume
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setPreviewOpen(true)}
                    >
                      Preview Changes
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </section>
          ) : atsPendingReview ? (
            <section className="space-y-3">
              <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
                Keyword scan ready
              </h2>
              <Card className="gap-0 py-0 ring-border/60">
                <CardContent className="space-y-3 px-4 py-4">
                  <p className="text-[15px] leading-snug text-muted-foreground">
                    Your scan found{" "}
                    <span className="font-semibold text-foreground">
                      {optimization!.keywordChanges.length}
                    </span>{" "}
                    keyword updates. Review them before building your resume.
                  </p>
                  <Button type="button" onClick={() => setPreviewOpen(true)}>
                    Review changes
                  </Button>
                </CardContent>
              </Card>
            </section>
          ) : null}

          <section className="space-y-3">
            <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
              Findings
            </h2>
            <Card className="gap-0 py-0 ring-border/60">
              <CardContent className="px-4 py-3">
                {category.findings.length > 0 ? (
                  <ul className="space-y-2.5">
                    {sortResumeReviewFindings(category.findings).map((finding) => (
                      <FindingRow key={finding.label} finding={finding} />
                    ))}
                  </ul>
                ) : (
                  <p className="text-[15px] text-muted-foreground">
                    No detailed findings for this category.
                  </p>
                )}
              </CardContent>
            </Card>
          </section>

          {improvement && !atsApplied ? (
            <section className="space-y-3">
              <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
                Top improvement
              </h2>
              <Card className="gap-2 border-primary/20 bg-primary/[0.06] py-4 ring-primary/15">
                <CardContent className="space-y-1 px-4">
                  <p className="text-[17px] font-semibold leading-snug">
                    {improvement.title}
                  </p>
                  <p className="text-[14px] font-medium text-emerald-400">
                    +{improvement.estimatedMatchImprovementPercent}% match
                    improvement
                  </p>
                  {improvement.detail ? (
                    <p className="text-[15px] leading-snug text-muted-foreground">
                      {improvement.detail}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            </section>
          ) : null}

          <ResumeReviewResourcesSection
            categoryKey={validKey as ResumeReviewCategoryKey}
          />
        </div>
      </div>

      {optimization?.scanCompleted ? (
        <AtsKeywordPreviewDrawer
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          optimization={optimization}
          mode={isAtsScanPendingReview(optimization) ? "review" : "view"}
          onApply={handleApplyOptimization}
          onDiscard={handleDiscardPending}
        />
      ) : null}
    </div>
  );
}
