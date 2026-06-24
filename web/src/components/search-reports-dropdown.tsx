"use client";

import { fitScoreOnTen } from "@/components/qualification-score-circle";
import { ReportLink } from "@/components/report-link";
import {
  activityMetaLine,
  resolveActivityFitScore,
  type RecentActivityItem,
} from "@/lib/recent-activity";
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
    ? items.filter((item) =>
        `${item.job_title ?? ""} ${item.company_name ?? ""}`
          .toLowerCase()
          .includes(q),
      )
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
            const fitScore = resolveActivityFitScore(item);
            return (
              <li key={item.id}>
                <ReportLink
                  from="/home"
                  analysis={item}
                  onClick={onSelect}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/8 active:bg-white/12"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[16px] font-medium text-white">
                      {item.job_title ?? "Untitled role"}
                    </p>
                    <p className="mt-0.5 truncate text-[13px] text-white/50">
                      {activityMetaLine(item)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p
                      className={cn(
                        "text-[17px] font-semibold tabular-nums",
                        scoreColor(fitScore),
                      )}
                    >
                      {fitScoreOnTen(fitScore)}
                    </p>
                    <p className="text-[11px] text-white/40">Fit</p>
                  </div>
                </ReportLink>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
