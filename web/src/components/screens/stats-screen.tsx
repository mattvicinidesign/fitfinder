"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  computeAnalysisStats,
  type AnalysisStats,
} from "@/lib/analysis-stats";
import { IosLargeTitle } from "@/components/ui/ios-large-title";
import { StatsDashboard } from "@/components/stats-dashboard";
import { SkeletonStatsDashboard } from "@/components/ui/skeletons/skeleton-stats-dashboard";
import {
  screenShellClass,
  StickyScreenBody,
} from "@/components/ui/sticky-bottom-cta";
import {
  ensureSampleAnalysisDataSeeded,
  getSampleAnalyses,
  pickAnalysisListWithSamples,
} from "@/lib/sample-analyses";
import type { AnalysisRecord } from "@/lib/types";

type StatsRow = AnalysisRecord & { report_id: string };

export function StatsScreen() {
  const [analyses, setAnalyses] = useState<StatsRow[]>([]);
  const [stats, setStats] = useState<AnalysisStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ensureSampleAnalysisDataSeeded();
    const supabase = createClient();

    void Promise.all([
      supabase
        .from("analyses")
        .select(
          "id, company_name, job_title, fit_score, qualification_score, confidence_score, recommendation, recommendation_label, created_at",
        )
        .order("created_at", { ascending: false }),
      supabase.from("saved_jobs").select("id", { count: "exact", head: true }),
    ]).then(([analysesResult, savedResult]) => {
      const rows = pickAnalysisListWithSamples(
        (analysesResult.data ?? []) as AnalysisRecord[],
        getSampleAnalyses(),
      ).map((row) => ({
        ...row,
        report_id: row.id,
      }));
      const savedCount = savedResult.count ?? getSampleAnalyses().length;
      setAnalyses(rows);
      setStats(computeAnalysisStats(rows, savedCount));
      setLoading(false);
    });
  }, []);

  return (
    <div className={screenShellClass}>
      <IosLargeTitle title="Stats" />

      <StickyScreenBody className="py-4">
        {loading || !stats ? (
          <SkeletonStatsDashboard />
        ) : stats.totalAnalyses === 0 ? (
          <p className="px-4 py-12 text-center text-[15px] text-muted-foreground">
            No analyses yet. Run your first from Analyze to see stats here.
          </p>
        ) : (
          <StatsDashboard analyses={analyses} stats={stats} />
        )}
      </StickyScreenBody>
    </div>
  );
}
