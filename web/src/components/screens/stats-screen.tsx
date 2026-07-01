"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  computeAnalysisStats,
  type AnalysisStats,
} from "@/lib/analysis-stats";
import { IosLargeTitle } from "@/components/ui/ios-large-title";
import { StatsDashboard } from "@/components/stats-dashboard";
import { SkeletonStatsDashboard } from "@/components/ui/skeletons/skeleton-stats-dashboard";
import {
  ALL_ACTIVITY_SECTION_ID,
  isResumeScoreActivity,
  loadRecentActivity,
  mergeRecentActivity,
  resolveActivityAnalysisRecord,
  type RecentActivityItem,
} from "@/lib/recent-activity";
import { scrollToSectionInAppContainer } from "@/lib/scroll-to-section";
import {
  screenShellClass,
  StickyScreenBody,
} from "@/components/ui/sticky-bottom-cta";
import {
  ensureSampleAnalysisDataSeeded,
  filterOpenableAnalyses,
  getSampleAnalyses,
  pickFitAnalysesForMetrics,
  pickRecentActivityList,
} from "@/lib/sample-analyses";
import type { AnalysisRecord } from "@/lib/types";

function buildStatsView(dbRows: AnalysisRecord[]) {
  ensureSampleAnalysisDataSeeded();

  const merged = mergeRecentActivity(
    dbRows,
    loadRecentActivity(),
    Number.MAX_SAFE_INTEGER,
  );
  const activityRows = pickRecentActivityList(merged, Number.MAX_SAFE_INTEGER);
  const fitRows = pickFitAnalysesForMetrics(
    filterOpenableAnalyses(
      merged.filter((item) => !isResumeScoreActivity(item)),
    ),
    getSampleAnalyses(),
  );

  return {
    fitRows,
    activityRows,
    stats: computeAnalysisStats(fitRows.map(resolveActivityAnalysisRecord)),
  };
}

export function StatsScreen() {
  const [analyses, setAnalyses] = useState<RecentActivityItem[]>([]);
  const [stats, setStats] = useState<AnalysisStats | null>(null);
  const [loading, setLoading] = useState(true);
  const dbRowsRef = useRef<AnalysisRecord[]>([]);
  const scrollBodyRef = useRef<HTMLDivElement>(null);

  const scrollToAllActivity = useCallback(() => {
    if (window.location.hash.replace(/^#/, "") !== ALL_ACTIVITY_SECTION_ID) {
      return;
    }

    scrollToSectionInAppContainer(ALL_ACTIVITY_SECTION_ID, {
      behavior: "auto",
      scrollRoot: scrollBodyRef.current,
    });
  }, []);

  const applySnapshot = useCallback((dbRows: AnalysisRecord[]) => {
    dbRowsRef.current = dbRows;
    const snapshot = buildStatsView(dbRows);
    setAnalyses(snapshot.activityRows);
    setStats(snapshot.stats);
    setLoading(false);
  }, []);

  const refreshLocalActivity = useCallback(() => {
    const snapshot = buildStatsView(dbRowsRef.current);
    setAnalyses(snapshot.activityRows);
    setStats(snapshot.stats);
  }, []);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    scrollBodyRef.current?.scrollTo(0, 0);
  }, []);

  useLayoutEffect(() => {
    if (loading || !stats) return;

    const run = () => scrollToAllActivity();
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(run);
    });

    return () => cancelAnimationFrame(raf);
  }, [loading, stats, analyses.length, scrollToAllActivity]);

  useEffect(() => {
    ensureSampleAnalysisDataSeeded();
    const supabase = createClient();

    const onFocus = () => refreshLocalActivity();

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);

    void supabase
      .from("analyses")
      .select(
        "id, company_name, job_title, fit_score, qualification_score, confidence_score, recommendation, recommendation_label, created_at",
      )
      .order("created_at", { ascending: false })
      .then((analysesResult) => {
        applySnapshot((analysesResult.data ?? []) as AnalysisRecord[]);
      });

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [applySnapshot, refreshLocalActivity]);

  useEffect(() => {
    const onHashChange = () => {
      if (loading || !stats) return;
      scrollToAllActivity();
    };

    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [loading, stats, scrollToAllActivity]);

  return (
    <div className={screenShellClass}>
      <IosLargeTitle title="Stats" />

      <StickyScreenBody ref={scrollBodyRef} className="py-4">
        {loading || !stats ? (
          <SkeletonStatsDashboard />
        ) : (
          <StatsDashboard analyses={analyses} stats={stats} />
        )}
      </StickyScreenBody>
    </div>
  );
}
