import { AlertTriangle, Check, ChevronRight, X } from "lucide-react";
import Link from "next/link";
import { ResumeReviewAnimatedScore } from "@/components/resume-review-animated-score";
import { Card } from "@/components/ui/card";
import { getResumeReviewCategoryIcon, getResumeReviewCategoryLabel } from "@/lib/resume-review-categories";
import {
  clampResumeReviewScore,
} from "@/lib/resume-review-score-colors";
import type { ReactNode } from "react";
import type {
  ResumeReviewCategory,
  ResumeReviewCategoryKey,
  ResumeReviewFinding,
} from "@/lib/types";
import { cn } from "@/lib/utils";

/** Shared layout for the four resume review category score cards. */
export const resumeReviewCategoryCardLayout = {
  card: "flex h-full flex-col gap-0 overflow-visible py-4 ring-border/60",
  link: "relative flex min-h-0 flex-1 flex-col overflow-visible px-3 py-3 outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring",
  chevron: "absolute right-3 top-3 size-4 shrink-0 text-muted-foreground",
  stack: "flex min-w-0 flex-col gap-3 pr-5 pt-1",
  icon: "size-9 shrink-0 text-primary",
  scoreRow: "flex min-h-10 flex-wrap items-center gap-x-2 gap-y-1.5",
  score:
    "shrink-0 text-[40px] font-bold leading-none tabular-nums tracking-tight text-foreground",
  scoreAccessory: "max-w-full shrink-0",
  label: "text-[15px] font-semibold leading-snug text-foreground",
  explanation: "text-[13px] leading-snug text-muted-foreground",
  footer: "space-y-2 px-3 pt-2",
} as const;

export function ResumeReviewCategoryScoreCard({
  categoryKey,
  href,
  ariaLabel,
  score,
  animate = false,
  animateDelay = 0,
  label,
  explanation,
  scoreAccessory,
  aboveScore,
  belowLabel,
  afterLabel,
  footer,
}: {
  categoryKey: ResumeReviewCategoryKey;
  href: string;
  ariaLabel: string;
  score: number;
  animate?: boolean;
  animateDelay?: number;
  label: string;
  explanation?: string;
  scoreAccessory?: ReactNode;
  aboveScore?: ReactNode;
  belowLabel?: ReactNode;
  /** Renders below the label instead of the explanation subtext. */
  afterLabel?: ReactNode;
  footer?: ReactNode;
}) {
  const Icon = getResumeReviewCategoryIcon(categoryKey);
  const layout = resumeReviewCategoryCardLayout;

  return (
    <Card size="sm" className={layout.card}>
      <Link href={href} aria-label={ariaLabel} className={layout.link}>
        <ChevronRight className={layout.chevron} aria-hidden />

        <div className={layout.stack}>
          <Icon className={layout.icon} strokeWidth={1.5} aria-hidden />

          {aboveScore}

          <div
            className={cn(
              layout.scoreRow,
              scoreAccessory && "flex-nowrap items-center",
            )}
          >
            {animate ? (
              <ResumeReviewAnimatedScore
                score={score}
                animate
                animateDelay={animateDelay}
              />
            ) : (
              <p className={layout.score}>
                {formatResumeReviewScorePercent(score)}
              </p>
            )}
            {scoreAccessory ? (
              <div className={cn(layout.scoreAccessory, "flex items-center")}>
                {scoreAccessory}
              </div>
            ) : null}
          </div>

          {belowLabel}

          <p className={layout.label}>{label}</p>
          {afterLabel ?? (
            explanation ? (
              <p className={layout.explanation}>{explanation}</p>
            ) : null
          )}
        </div>
      </Link>
      {footer}
    </Card>
  );
}

export function gradeTone(grade: string): string {
  if (grade.startsWith("A")) return "text-emerald-400";
  if (grade.startsWith("B")) return "text-sky-400";
  if (grade.startsWith("C")) return "text-amber-400";
  return "text-rose-400";
}

export function ScoreProgressBar({
  score,
  label,
  className,
}: {
  score: number;
  label: string;
  className?: string;
}) {
  const clamped = clampResumeReviewScore(score);

  return (
    <div
      className={cn("relative h-1.5 overflow-hidden rounded-full bg-border", className)}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className="absolute inset-y-0 left-0 rounded-full bg-primary"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

export function ScoreProgressBarVertical({
  score,
  label,
  className,
}: {
  score: number;
  label: string;
  className?: string;
}) {
  const clamped = clampResumeReviewScore(score);

  return (
    <div
      className={cn(
        "relative h-20 w-2.5 shrink-0 overflow-hidden rounded-full bg-muted",
        className,
      )}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 rounded-full bg-primary transition-[height] duration-500",
        )}
        style={{ height: `${clamped}%` }}
      />
    </div>
  );
}

export function formatResumeReviewScorePercent(score: number): string {
  return `${Math.max(0, Math.min(100, Math.round(score)))}%`;
}

const FINDING_STATUS_ORDER: Record<ResumeReviewFinding["status"], number> = {
  pass: 0,
  warn: 1,
  fail: 2,
};

export function sortResumeReviewFindings(
  findings: ResumeReviewFinding[],
): ResumeReviewFinding[] {
  return [...findings].sort(
    (a, b) => FINDING_STATUS_ORDER[a.status] - FINDING_STATUS_ORDER[b.status],
  );
}

export function partitionResumeReviewFindings(findings: ResumeReviewFinding[]) {
  const sorted = sortResumeReviewFindings(findings);
  return {
    strengths: sorted.filter((finding) => finding.status === "pass"),
    needsImprovement: sorted.filter((finding) => finding.status !== "pass"),
  };
}

export function FindingRow({ finding }: { finding: ResumeReviewFinding }) {
  const Icon =
    finding.status === "pass"
      ? Check
      : finding.status === "fail"
        ? X
        : AlertTriangle;
  const tone =
    finding.status === "pass"
      ? "text-emerald-400"
      : finding.status === "fail"
        ? "text-rose-400"
        : "text-amber-400";

  return (
    <li className="flex items-start gap-2.5 text-[15px] leading-snug">
      <Icon className={cn("mt-0.5 size-4 shrink-0", tone)} aria-hidden />
      <span className="text-foreground/90">{finding.label}</span>
    </li>
  );
}

export function ImprovementAlertRow({ title }: { title: string }) {
  return (
    <li className="flex items-start gap-2.5 text-[15px] leading-snug">
      <AlertTriangle
        className="mt-0.5 size-4 shrink-0 text-amber-400"
        aria-hidden
      />
      <span className="font-medium text-foreground/90">{title}</span>
    </li>
  );
}

export function NextStepRow({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-2.5 text-[15px] leading-snug">
      <span
        className="mt-[0.45rem] size-1.5 shrink-0 rounded-full bg-primary"
        aria-hidden
      />
      <span className="text-foreground/90">{text}</span>
    </li>
  );
}

export function ResumeReviewCategoryRow({
  category,
  animate = false,
  animateDelay = 0,
}: {
  category: ResumeReviewCategory;
  animate?: boolean;
  animateDelay?: number;
}) {
  const label = getResumeReviewCategoryLabel(category.key);
  const scoreLabel = formatResumeReviewScorePercent(category.score);

  return (
    <ResumeReviewCategoryScoreCard
      categoryKey={category.key}
      href={`/resume-review/${category.key}`}
      ariaLabel={`${label}, ${scoreLabel}. ${category.explanation}`}
      score={category.score}
      animate={animate}
      animateDelay={animateDelay}
      label={label}
      explanation={category.explanation}
    />
  );
}
