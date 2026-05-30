"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { IosLargeTitle } from "@/components/ui/ios-large-title";
import { IosGroupedSection } from "@/components/ui/ios-grouped-section";
import { IosAnalysisListRow } from "@/components/ui/ios-list-row";
import { buttonVariants } from "@/components/ui/button";
import type { AnalysisRecord } from "@/lib/types";

export function SavedScreen() {
  const [analyses, setAnalyses] = useState<AnalysisRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
            .filter(Boolean) as AnalysisRecord[];
          setAnalyses(rows);
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
        <div className="px-4">
          <Link href="/analyze" className={buttonVariants({ className: "w-full h-11 rounded-xl" })}>
            New analysis
          </Link>
        </div>

        {loading ? (
          <p className="px-4 text-[15px] text-muted-foreground">Loading…</p>
        ) : analyses.length === 0 ? (
          <p className="px-4 text-[15px] text-muted-foreground text-center py-12">
            No saved jobs yet. Save one from an analysis result.
          </p>
        ) : (
          <IosGroupedSection>
            {analyses.map((a) => (
              <IosAnalysisListRow key={a.id} analysis={a} />
            ))}
          </IosGroupedSection>
        )}
      </div>
    </>
  );
}
