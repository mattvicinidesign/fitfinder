"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/page-header";
import { AnalysisCard } from "@/components/analysis-card";
import { buttonVariants } from "@/components/ui/button";
import type { AnalysisRecord } from "@/lib/types";

export default function SavedPage() {
  const [analyses, setAnalyses] = useState<AnalysisRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    void supabase
      .from("saved_jobs")
      .select(
        `
        analysis_id,
        analyses (
          id, company_name, job_title, fit_score, qualification_score,
          confidence_score, recommendation, created_at
        )
      `,
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
    <div className="mx-auto max-w-5xl px-4 py-6 md:py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title="Saved jobs"
          description="Opportunities you bookmarked from analyses."
        />
        <Link href="/analyze" className={buttonVariants()}>
          New analysis
        </Link>
      </div>

      {loading ? (
        <p className="mt-10 text-sm text-muted-foreground">Loading…</p>
      ) : analyses.length === 0 ? (
        <div className="mt-10 flex min-h-48 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
          No saved jobs yet. Save one from an analysis result.
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {analyses.map((a) => (
            <AnalysisCard key={a.id} analysis={a} />
          ))}
        </div>
      )}
    </div>
  );
}
