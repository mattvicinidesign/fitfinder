"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  computeAnalysisStats,
  type AnalysisStats,
} from "@/lib/analysis-stats";
import { IosLargeTitle } from "@/components/ui/ios-large-title";
import {
  IosGroupedRow,
  IosGroupedSection,
} from "@/components/ui/ios-grouped-section";
import { GuestUpgradePrompt } from "@/components/guest-upgrade-prompt";
import { SkeletonChart } from "@/components/ui/skeletons";
import {
  ensureSampleAnalysisDataSeeded,
  getSampleAnalyses,
  pickAnalysisListWithSamples,
} from "@/lib/sample-analyses";
import { scoreColor } from "@/lib/score";
import type { AnalysisRecord } from "@/lib/types";

function StatValue({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-[17px] text-foreground">{label}</span>
      <span
        className={`text-[17px] font-semibold tabular-nums ${valueClassName ?? ""}`}
      >
        {value}
      </span>
    </div>
  );
}

function formatAverage(value: number | null, suffix = ""): string {
  if (value == null) return "—";
  return `${value}${suffix}`;
}

export function StatsScreen() {
  const [stats, setStats] = useState<AnalysisStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ensureSampleAnalysisDataSeeded();
    const supabase = createClient();

    void Promise.all([
      supabase
        .from("analyses")
        .select(
          "id, fit_score, qualification_score, confidence_score, recommendation, recommendation_label",
        )
        .order("created_at", { ascending: false }),
      supabase.from("saved_jobs").select("id", { count: "exact", head: true }),
    ]).then(([analysesResult, savedResult]) => {
      const rows = pickAnalysisListWithSamples(
        (analysesResult.data ?? []) as AnalysisRecord[],
        getSampleAnalyses(),
      );
      const savedCount = savedResult.count ?? getSampleAnalyses().length;
      setStats(computeAnalysisStats(rows, savedCount));
      setLoading(false);
    });
  }, []);

  return (
    <>
      <IosLargeTitle
        title="Stats"
        subtitle="Your fit analysis trends at a glance."
      />

      <div className="py-4 space-y-6">
        <GuestUpgradePrompt variant="history" />

        {loading || !stats ? (
          <div className="px-4">
            <SkeletonChart />
          </div>
        ) : stats.totalAnalyses === 0 ? (
          <p className="px-4 text-[15px] text-muted-foreground text-center py-12">
            No analyses yet. Run your first from Analyze to see stats here.
          </p>
        ) : (
          <>
            <IosGroupedSection title="Overview">
              <IosGroupedRow className="space-y-3">
                <StatValue label="Total analyses" value={String(stats.totalAnalyses)} />
                <StatValue label="Saved opportunities" value={String(stats.savedCount)} />
                <StatValue
                  label="Average fit score"
                  value={formatAverage(stats.averageFit)}
                  valueClassName={scoreColor(stats.averageFit ?? 0)}
                />
                <StatValue
                  label="Average qualification"
                  value={formatAverage(stats.averageQualification)}
                />
                <StatValue
                  label="Average confidence"
                  value={formatAverage(stats.averageConfidence)}
                />
              </IosGroupedRow>
            </IosGroupedSection>

            {stats.recommendationStats.length > 0 ? (
              <IosGroupedSection
                title="By recommendation"
                footer="Based on all analyses in your history."
              >
                <IosGroupedRow className="space-y-4">
                  {stats.recommendationStats.map((item) => (
                    <div key={item.label} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-3 text-[15px]">
                        <span className="truncate">{item.label}</span>
                        <span className="shrink-0 tabular-nums text-muted-foreground">
                          {item.count} · {item.pct}%
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${item.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </IosGroupedRow>
              </IosGroupedSection>
            ) : null}
          </>
        )}
      </div>
    </>
  );
}
