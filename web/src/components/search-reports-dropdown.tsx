"use client";

import { fitScoreOnTen } from "@/components/qualification-score-circle";
import { RecentActivityLink } from "@/components/recent-activity-link";
import {
  activityMetaLine,
  isResumeScoreActivity,
  matchesReportSearchQuery,
  resolveActivityFitScore,
  resolveActivityResumeScore,
  type RecentActivityItem,
} from "@/lib/recent-activity";
import { formatResumeReviewScorePercent } from "@/components/resume-review-ui";
import { resumeReviewScoreTextClass } from "@/lib/resume-review-score-colors";
import { scoreColor } from "@/lib/score";
import { cn } from "@/lib/utils";

const MAX_RESULTS = 8;
const MAX_RECENT = 5;

export function filterSearchReportItems(
  items: RecentActivityItem[],
  query: string,
): RecentActivityItem[] {
  const q = query.trim().toLowerCase();
  const pool = q
    ? items.filter((item) => matchesReportSearchQuery(item, query))
    : items;
  return pool.slice(0, q ? MAX_RESULTS : MAX_RECENT);
}

export function SearchReportsDropdown({
  items,
  query,
  loading,
  onSelect,
  className,
}: {
  items: RecentActivityItem[];
  query: string;
  loading?: boolean;
  onSelect: () => void;
  className?: string;
}) {
  const hasQuery = query.trim().length > 0;

  return (
    <div
      role="listbox"
      aria-label={hasQuery ? "Search results" : "Recent reports"}
      onMouseDown={(event) => event.preventDefault()}
      className={cn(
        "absolute top-full left-0 right-0 z-50 mt-2 overflow-hidden rounded-2xl border border-white/15 bg-[#0f1419]/96 shadow-[0_16px_40px_rgba(0,0,0,0.45)] ring-1 ring-white/10 backdrop-blur-md",
        className,
      )}
    >
      <div className="border-b border-white/10 px-4 py-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-white/45">
          {hasQuery ? "Matching reports" : "Recent reports"}
        </p>
      </div>

      {loading ? (
        <p className="px-4 py-6 text-center text-[14px] text-white/50">
          Loading reports…
        </p>
      ) : items.length === 0 ? (
        <p className="px-4 py-6 text-center text-[14px] text-white/50">
          {hasQuery ? "No reports match your search." : "No reports yet."}
        </p>
      ) : (
        <ul className="max-h-[min(18rem,50vh)] overflow-y-auto overscroll-contain">
          {items.map((item) => {
            const isResume = isResumeScoreActivity(item);
            const fitScore = isResume ? null : resolveActivityFitScore(item);
            const resumeScore = isResume ? resolveActivityResumeScore(item) : null;
            return (
              <li key={item.id}>
                <RecentActivityLink
                  from="/home"
                  item={item}
                  onClick={onSelect}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/8 active:bg-white/12"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[16px] font-medium text-white">
                      {item.job_title ?? (isResume ? "Resume score" : "Untitled role")}
                    </p>
                    <p className="mt-0.5 truncate text-[13px] text-white/50">
                      {activityMetaLine(item)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p
                      className={cn(
                        "text-[17px] font-semibold tabular-nums",
                        isResume
                          ? resumeReviewScoreTextClass(resumeScore ?? 0)
                          : scoreColor(fitScore ?? 0),
                      )}
                    >
                      {isResume
                        ? formatResumeReviewScorePercent(resumeScore ?? 0)
                        : fitScoreOnTen(fitScore ?? 0)}
                    </p>
                    <p className="text-[11px] text-white/40">
                      {isResume ? "Score" : "Fit"}
                    </p>
                  </div>
                </RecentActivityLink>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
