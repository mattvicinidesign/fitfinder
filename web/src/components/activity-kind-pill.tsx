import {
  isResumeScoreActivity,
  type RecentActivityItem,
} from "@/lib/recent-activity";
import { cn } from "@/lib/utils";

const PILL_BASE_CLASS =
  "inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[11px] font-semibold leading-none whitespace-nowrap";

export function ActivityKindPill({
  item,
  className,
}: {
  item: Pick<RecentActivityItem, "activity_kind" | "report_id">;
  className?: string;
}) {
  const isResume = isResumeScoreActivity(item);

  return (
    <span
      className={cn(
        PILL_BASE_CLASS,
        isResume
          ? "bg-muted text-muted-foreground"
          : "border border-primary/45 bg-primary/10 text-primary",
        className,
      )}
    >
      {isResume ? "Resume Score" : "Fit Analysis"}
    </span>
  );
}
