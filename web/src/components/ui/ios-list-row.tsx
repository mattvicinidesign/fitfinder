import { cn } from "@/lib/utils";
import { MetricScore } from "@/components/ui/metric-score";
import { fitScoreOnTen } from "@/components/qualification-score-circle";
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

  if (isResume) {
    const resumeScore = resolveActivityResumeScore(item);
    return (
      <div className={cn("flex items-center gap-3 bg-background px-4 py-3.5", className)}>
        <div className="min-w-0 flex-1">
          <p className="text-[17px] font-semibold leading-tight truncate">
            {a.job_title ?? "Resume score"}
          </p>
          {subtitle ? (
            <p className="text-[14px] text-muted-foreground leading-snug truncate mt-0.5">
              {subtitle}
            </p>
          ) : null}
        </div>
        <div className="text-right shrink-0">
          <MetricScore
            as="p"
            size="md"
            className={resumeReviewScoreTextClass(resumeScore)}
          >
            {formatResumeReviewScorePercent(resumeScore)}
          </MetricScore>
          <p className="text-[11px] text-muted-foreground mt-0.5">Score</p>
        </div>
      </div>
    );
  }

  const fitScore = resolveActivityFitScore(item);

  return (
    <div className={cn("flex items-center gap-3 bg-background px-4 py-3.5", className)}>
      <div className="min-w-0 flex-1">
        <p className="text-[17px] font-semibold leading-tight truncate">
          {a.job_title ?? "Untitled role"}
        </p>
        {subtitle ? (
          <p className="text-[14px] text-muted-foreground leading-snug truncate mt-0.5">
            {subtitle}
          </p>
        ) : (
          <>
            {a.company_name ? (
              <p className="text-[15px] text-muted-foreground truncate">
                {a.company_name}
              </p>
            ) : null}
            {a.recommendation_label ? (
              <p className="text-[13px] text-muted-foreground mt-0.5">
                {a.recommendation_label}
              </p>
            ) : null}
          </>
        )}
      </div>
      <div className="text-right shrink-0">
        <MetricScore as="p" size="md" className={scoreColor(fitScore)}>
          {fitScoreOnTen(fitScore)}
        </MetricScore>
        <p className="text-[11px] text-muted-foreground mt-0.5">Fit</p>
      </div>
    </div>
  );
}
