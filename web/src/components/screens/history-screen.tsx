"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { IosLargeTitle } from "@/components/ui/ios-large-title";
import { IosGroupedSection } from "@/components/ui/ios-grouped-section";
import { IosAnalysisListRow } from "@/components/ui/ios-list-row";
import { buttonVariants } from "@/components/ui/button";
import { GuestUpgradePrompt } from "@/components/guest-upgrade-prompt";
import { SkeletonAnalysisList } from "@/components/ui/skeletons";
import {
  ensureSampleAnalysisDataSeeded,
  getSampleAnalyses,
  pickAnalysisListWithSamples,
} from "@/lib/sample-analyses";
import {
  activityMetaLine,
  type RecentActivityItem,
} from "@/lib/recent-activity";
import { ReportLink } from "@/components/report-link";
import type { AnalysisRecord } from "@/lib/types";

export function HistoryScreen() {
  const [analyses, setAnalyses] = useState<AnalysisRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ensureSampleAnalysisDataSeeded();
    const supabase = createClient();
    void supabase
      .from("analyses")
      .select(
        "id, company_name, job_title, fit_score, qualification_score, confidence_score, recommendation, recommendation_label, created_at",
      )
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        const rows = ((data ?? []) as AnalysisRecord[]).map((row) => ({
          ...row,
          report_id: row.id,
        })) as RecentActivityItem[];
        setAnalyses(pickAnalysisListWithSamples(rows, getSampleAnalyses()));
        setLoading(false);
      });
  }, []);

  return (
    <>
      <IosLargeTitle title="History" subtitle="Every fit analysis you have run." />

      <div className="py-4 space-y-4">
        <div className="px-4">
          <Link href="/analyze" className={buttonVariants({ className: "w-full h-11 rounded-xl" })}>
            New analysis
          </Link>
        </div>

        <GuestUpgradePrompt variant="history" />

        {loading ? (
          <SkeletonAnalysisList count={5} />
        ) : analyses.length === 0 ? (
          <p className="px-4 text-[15px] text-muted-foreground text-center py-12">
            No analyses yet. Run your first from Analyze.
          </p>
        ) : (
          <IosGroupedSection>
            {analyses.map((a) => (
              <ReportLink
                key={a.id}
                analysis={a}
                from="/history"
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
