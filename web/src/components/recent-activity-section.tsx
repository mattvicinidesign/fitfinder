"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { RecentActivityLink } from "@/components/recent-activity-link";
import { Button } from "@/components/ui/button";
import { IosGroupedSection } from "@/components/ui/ios-grouped-section";
import { IosAnalysisListRow } from "@/components/ui/ios-list-row";
import { SkeletonAnalysisList } from "@/components/ui/skeletons";
import { RecentActivityZeroState } from "@/components/recent-activity-zero-state";
import {
  activityMetaLine,
  ALL_ACTIVITY_PAGE_SIZE,
  ALL_ACTIVITY_SECTION_ID,
  HOME_RECENT_ACTIVITY_DISPLAY_LIMIT,
  STATS_ALL_ACTIVITY_HREF,
  type RecentActivityItem,
} from "@/lib/recent-activity";
import { FORM_FIELD_LABEL_CLASS } from "@/components/form-field-styles";
import { cn } from "@/lib/utils";

function ActivityList({
  items,
  from,
}: {
  items: RecentActivityItem[];
  from: "/home" | "/stats";
}) {
  return (
    <IosGroupedSection fullWidth>
      {items.map((item) => (
        <RecentActivityLink
          key={item.id}
          item={item}
          from={from}
          className="block transition-colors hover:bg-muted/30 active:bg-muted/40"
        >
          <IosAnalysisListRow
            analysis={item}
            subtitle={activityMetaLine(item)}
            className="px-0"
          />
        </RecentActivityLink>
      ))}
    </IosGroupedSection>
  );
}

type RecentActivitySectionProps = {
  items: RecentActivityItem[];
  from: "/home" | "/stats";
  loading?: boolean;
  className?: string;
  /** Home preview (default) or Stats full list with lazy load. */
  variant?: "home" | "all";
  /** Home only — link to Stats #all-activity when more rows exist. */
  showViewAll?: boolean;
};

export function RecentActivitySection({
  items,
  from,
  loading = false,
  className,
  variant = "home",
  showViewAll = false,
}: RecentActivitySectionProps) {
  const isAllActivity = variant === "all";
  const title = isAllActivity ? "All Activity" : "Recent activity";
  const skeletonCount = isAllActivity
    ? ALL_ACTIVITY_PAGE_SIZE
    : HOME_RECENT_ACTIVITY_DISPLAY_LIMIT;

  const [visibleCount, setVisibleCount] = useState(ALL_ACTIVITY_PAGE_SIZE);
  const visibleItems = isAllActivity ? items.slice(0, visibleCount) : items;
  const hasMoreToLoad = isAllActivity && visibleCount < items.length;

  useEffect(() => {
    if (!isAllActivity) return;
    setVisibleCount(ALL_ACTIVITY_PAGE_SIZE);
  }, [isAllActivity, items]);

  return (
    <section
      id={isAllActivity ? ALL_ACTIVITY_SECTION_ID : undefined}
      className={cn("space-y-2", className)}
    >
      <h2 className={FORM_FIELD_LABEL_CLASS}>{title}</h2>

      {loading ? (
        <SkeletonAnalysisList
          count={skeletonCount}
          className="mx-0"
          rowClassName="px-0"
        />
      ) : items.length === 0 ? (
        <RecentActivityZeroState />
      ) : (
        <>
          <ActivityList items={visibleItems} from={from} />

          {isAllActivity && hasMoreToLoad ? (
            <div className="flex justify-center pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-[15px] font-medium text-primary"
                onClick={() =>
                  setVisibleCount((count) =>
                    Math.min(count + ALL_ACTIVITY_PAGE_SIZE, items.length),
                  )
                }
              >
                Load more
              </Button>
            </div>
          ) : null}

          {!isAllActivity && showViewAll ? (
            <div className="flex justify-center pt-1">
              <Link
                href={STATS_ALL_ACTIVITY_HREF}
                scroll={false}
                className="text-[15px] font-medium text-primary transition-colors hover:text-primary/80"
              >
                View All
              </Link>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
