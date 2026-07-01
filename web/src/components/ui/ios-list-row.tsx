import { cn } from "@/lib/utils";
import { ActivityKindPill } from "@/components/activity-kind-pill";
import { FitScoreRatio } from "@/components/fit-score-ratio";
import { MetricScore } from "@/components/ui/metric-score";
import {
  fitScoreValueOnTen,
} from "@/components/qualification-score-circle";
import { formatResumeReviewScorePercent } from "@/components/resume-review-ui";
import {
  isResumeScoreActivity,
  resolveActivityFitScore,
  resolveActivityResumeScore,
  type RecentActivityItem,
} from "@/lib/recent-activity";
import { resumeReviewScoreTextClass } from "@/lib/resume-review-score-colors";
import { scoreColor } from "@/lib/score";
import type { AnalysisRecord } from "@/lib/types";

/** Reference proportions: name ~58%, pill centered in middle band, score pinned right. */
const ACTIVITY_ROW_GRID_CLASS =
  "grid grid-cols-[minmax(0,58%)_minmax(0,1fr)_minmax(4.5rem,auto)] items-center gap-x-2";

/** Single recent-activity row — fit analysis or resume score. */
export function IosAnalysisListRow({
  analysis: a,
  subtitle,
  className,
}: {
  analysis: AnalysisRecord & { report_id?: string; activity_kind?: string; resume_score?: number | null };
  /** When set, replaces company name + recommendation (e.g. posting meta line). */
  subtitle?: string | null;
  className?: string;
}) {
  const item = {
    ...(a as RecentActivityItem),
    report_id: a.report_id ?? a.id,
  };
  const isResume = isResumeScoreActivity(item);

  const scoreValue = isResume
    ? resolveActivityResumeScore(item)
    : resolveActivityFitScore(item);
  const scoreLabel = isResume
    ? formatResumeReviewScorePercent(scoreValue)
    : null;
  const scoreClass = isResume
    ? resumeReviewScoreTextClass(scoreValue)
    : scoreColor(scoreValue);
  const fitScoreOnTen = isResume ? null : fitScoreValueOnTen(scoreValue);

  const secondaryLine =
    subtitle ??
    (isResume
      ? null
      : a.company_name?.trim() || a.recommendation_label?.trim() || null);

  return (
    <div
      className={cn(
        ACTIVITY_ROW_GRID_CLASS,
        "bg-background px-4 py-3.5",
        className,
      )}
    >
      <div className="min-w-0">
        <p className="truncate text-[17px] font-semibold leading-tight text-foreground">
          {a.job_title ?? (isResume ? "Resume score" : "Untitled role")}
        </p>
        {secondaryLine ? (
          <p className="mt-0.5 truncate text-[13px] leading-snug text-muted-foreground">
            {secondaryLine}
          </p>
        ) : null}
      </div>

      <div className="flex min-w-0 justify-center">
        <ActivityKindPill item={item} />
      </div>

      <div className="min-w-[4.5rem] justify-self-end text-right">
        {isResume ? (
          <MetricScore as="p" size="md" className={scoreClass}>
            {scoreLabel}
          </MetricScore>
        ) : (
          <FitScoreRatio
            as="p"
            valueOnTen={fitScoreOnTen ?? 0}
            size="md"
            className={scoreClass}
          />
        )}
      </div>
    </div>
  );
}
