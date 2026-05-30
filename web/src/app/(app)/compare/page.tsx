"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/page-header";
import { AnalysisResultView } from "@/components/analysis-result";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { AnalysisRecord, AnalysisResult, Narrative } from "@/lib/types";
import { toast } from "sonner";

type FullAnalysis = AnalysisRecord & {
  narrative_json: Narrative | null;
  parsed_job_json: AnalysisResult["parsedJob"] | null;
  career_fit_adjustment: number | null;
};

function toResult(row: FullAnalysis): AnalysisResult | null {
  if (!row.parsed_job_json || !row.narrative_json) return null;
  return {
    companyName: row.company_name,
    jobTitle: row.job_title,
    parsedJob: row.parsed_job_json,
    score: {
      qualificationScore: row.qualification_score ?? 0,
      confidenceScore: row.confidence_score ?? 0,
      careerFitAdjustment: row.career_fit_adjustment ?? 0,
      fitScore: row.fit_score ?? 0,
      recommendation: row.recommendation ?? "stretch",
      breakdown: {
        skillsMatch: 0,
        toolsMatch: 0,
        aiMatch: 0,
        industryAlignment: 0,
        signalCoverage: 0,
      },
    },
    narrative: row.narrative_json,
  };
}

export default function ComparePage() {
  const [analyses, setAnalyses] = useState<FullAnalysis[]>([]);
  const [aId, setAId] = useState("");
  const [bId, setBId] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    void supabase
      .from("analyses")
      .select(
        "id, company_name, job_title, fit_score, qualification_score, confidence_score, career_fit_adjustment, recommendation, narrative_json, parsed_job_json, created_at",
      )
      .order("created_at", { ascending: false })
      .then(({ data }) => setAnalyses((data ?? []) as FullAnalysis[]));
  }, []);

  const a = analyses.find((x) => x.id === aId);
  const b = analyses.find((x) => x.id === bId);
  const resultA = a ? toResult(a) : null;
  const resultB = b ? toResult(b) : null;

  async function persistComparison() {
    if (!aId || !bId || aId === bId) {
      toast.error("Pick two different analyses.");
      return;
    }
    setBusy(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Sign in required.");
      setBusy(false);
      return;
    }
    const { error } = await supabase.from("comparisons").insert({
      user_id: user.id,
      analysis_a_id: aId,
      analysis_b_id: bId,
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("Comparison saved.");
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:py-10">
      <PageHeader
        title="Compare jobs"
        description="Side-by-side fit scores for two saved analyses."
      />

      <div className="mt-8 grid gap-4 sm:grid-cols-2 max-w-2xl">
        <div className="space-y-2">
          <Label htmlFor="cmp-a">Role A</Label>
          <select
            id="cmp-a"
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            value={aId}
            onChange={(e) => setAId(e.target.value)}
          >
            <option value="">Select analysis…</option>
            {analyses.map((x) => (
              <option key={x.id} value={x.id}>
                {x.job_title ?? "Job"} · {x.company_name ?? "—"} (fit{" "}
                {Math.round(x.fit_score ?? 0)})
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="cmp-b">Role B</Label>
          <select
            id="cmp-b"
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            value={bId}
            onChange={(e) => setBId(e.target.value)}
          >
            <option value="">Select analysis…</option>
            {analyses.map((x) => (
              <option key={x.id} value={x.id}>
                {x.job_title ?? "Job"} · {x.company_name ?? "—"} (fit{" "}
                {Math.round(x.fit_score ?? 0)})
              </option>
            ))}
          </select>
        </div>
      </div>

      <Button
        className="mt-4"
        variant="outline"
        disabled={busy}
        onClick={persistComparison}
      >
        Save comparison
      </Button>

      {resultA && resultB ? (
        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          <div>
            <h2 className="mb-4 text-lg font-semibold">Role A</h2>
            <AnalysisResultView result={resultA} />
          </div>
          <div>
            <h2 className="mb-4 text-lg font-semibold">Role B</h2>
            <AnalysisResultView result={resultB} />
          </div>
        </div>
      ) : (
        <p className="mt-10 text-sm text-muted-foreground">
          Select two analyses with stored narrative data to compare.
        </p>
      )}
    </div>
  );
}
