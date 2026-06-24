"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { IosLargeTitle } from "@/components/ui/ios-large-title";
import { IosGroupedSection } from "@/components/ui/ios-grouped-section";
import { IosAnalysisListRow } from "@/components/ui/ios-list-row";
import { GuestUpgradePrompt } from "@/components/guest-upgrade-prompt";
import { SkeletonAnalysisList } from "@/components/ui/skeletons";
import {
  ensureSampleAnalysisDataSeeded,
  getSampleSavedAnalyses,
  pickAnalysisListWithSamples,
} from "@/lib/sample-analyses";
import {
  activityMetaLine,
  type RecentActivityItem,
} from "@/lib/recent-activity";
import { ReportLink } from "@/components/report-link";
import type { AnalysisRecord } from "@/lib/types";

export function SavedScreen() {
  const [analyses, setAnalyses] = useState<AnalysisRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ensureSampleAnalysisDataSeeded();
    const supabase = createClient();
    void supabase
      .from("saved_jobs")
      .select(
        `analysis_id, analyses (id, company_name, job_title, fit_score, qualification_score, confidence_score, recommendation, recommendation_label, created_at)`,
      )
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) {
          const rows = data
            .map((row) => {
              const a = row.analyses;
              return Array.isArray(a) ? a[0] : a;
            })
            .filter(Boolean)
            .map((row) => ({
              ...(row as AnalysisRecord),
              report_id: (row as AnalysisRecord).id,
            })) as RecentActivityItem[];
          setAnalyses(
            pickAnalysisListWithSamples(rows, getSampleSavedAnalyses()),
          );
        } else {
          setAnalyses(getSampleSavedAnalyses());
        }
        setLoading(false);
      });
  }, []);

  return (
    <>
      <IosLargeTitle
        title="Saved"
        subtitle="Jobs you bookmarked from analyses."
      />

      <div className="py-4 space-y-4">
        <GuestUpgradePrompt variant="save" />

        {loading ? (
          <SkeletonAnalysisList count={5} />
        ) : analyses.length === 0 ? (
          <p className="px-4 text-[15px] text-muted-foreground text-center py-12">
            No saved jobs yet. Save one from an analysis result.
          </p>
        ) : (
          <IosGroupedSection>
            {analyses.map((a) => (
              <ReportLink
                key={a.id}
                analysis={a}
                from="/saved"
                className="block transition-colors hover:bg-muted/30 active:bg-muted/40"
              >
                <IosAnalysisListRow
                  analysis={a}
                  subtitle={activityMetaLine(a as RecentActivityItem)}
                />
              </ReportLink>
            ))}
          </IosGroupedSection>
        )}
      </div>
    </>
  );
}
