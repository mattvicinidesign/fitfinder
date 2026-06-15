"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { IosLargeTitle } from "@/components/ui/ios-large-title";
import { IosGroupedRow, IosGroupedSection } from "@/components/ui/ios-grouped-section";
import { AnalysisResultView } from "@/components/analysis-result";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  fetchProfileDesiredCompensation,
  fetchProfileQualifiedIndustries,
  fetchProfileQualifiedSkills,
  fetchProfileCountry,
  fetchProfileTimezone,
} from "@/lib/profile-compensation";
import { fetchUserProfile } from "@/lib/profile";
import { loadLocalProfilePrefs } from "@/lib/local-profile-prefs";
import { resolvePostingContext } from "@/lib/posting-context";
import type { AnalysisRecord, AnalysisResult, Compensation, Narrative } from "@/lib/types";
import { toast } from "sonner";

type FullAnalysis = AnalysisRecord & {
  narrative_json: Narrative | null;
  parsed_job_json: AnalysisResult["parsedJob"] | null;
  job_description: string | null;
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
      recommendationLabel: row.recommendation_label ?? "",
      scoringMode: "registered",
      categoryBreakdown: [],
      unknownCategories: [],
      explanation: "Re-run analyze for full V1 category breakdown.",
      strengths: [],
      gaps: [],
      positiveSignalsFound: [],
      negativeSignalsFound: [],
    },
    narrative: row.narrative_json,
    postingContext: resolvePostingContext(row.parsed_job_json),
    jobDescription: row.job_description,
  };
}

export function CompareScreen() {
  const [analyses, setAnalyses] = useState<FullAnalysis[]>([]);
  const [aId, setAId] = useState("");
  const [bId, setBId] = useState("");
  const [busy, setBusy] = useState(false);
  const [profileDesiredCompensation, setProfileDesiredCompensation] =
    useState<Compensation | null>(null);
  const [profileQualifiedIndustries, setProfileQualifiedIndustries] = useState<
    string[]
  >([]);
  const [profileQualifiedSkills, setProfileQualifiedSkills] = useState<
    string[]
  >([]);
  const [profileCountry, setProfileCountry] = useState<string | null>(null);
  const [profileTimezone, setProfileTimezone] = useState<string | null>(null);
  const [profilePreferredCompanyTypes, setProfilePreferredCompanyTypes] =
    useState<string[]>([]);
  const [profilePreferredMinimumEmployerRating, setProfilePreferredMinimumEmployerRating] =
    useState<number | null>(null);
  const [profilePreferredRegions, setProfilePreferredRegions] = useState<string[]>(
    () => loadLocalProfilePrefs()?.preferredRegions ?? [],
  );
  const [profilePreferredProjectTypes, setProfilePreferredProjectTypes] =
    useState<string[]>(() => loadLocalProfilePrefs()?.preferredProjectTypes ?? []);
  const [profileMinimumHourlyRate, setProfileMinimumHourlyRate] = useState<number | null>(
    () => loadLocalProfilePrefs()?.minimumHourlyRate ?? null,
  );

  useEffect(() => {
    void Promise.all([
      fetchProfileDesiredCompensation(),
      fetchProfileQualifiedIndustries(),
      fetchProfileQualifiedSkills(),
      fetchProfileCountry(),
      fetchProfileTimezone(),
      fetchUserProfile(),
    ]).then(([pay, industries, skills, country, timezone, profile]) => {
      setProfileDesiredCompensation(pay);
      setProfileQualifiedIndustries(industries);
      setProfileQualifiedSkills(skills);
      setProfileCountry(country);
      setProfileTimezone(timezone);
      if (profile) {
        setProfilePreferredCompanyTypes(profile.preferredCompanyTypes);
        setProfilePreferredMinimumEmployerRating(
          profile.preferredMinimumEmployerRating,
        );
        setProfilePreferredRegions(profile.preferredRegions);
        setProfilePreferredProjectTypes(profile.preferredProjectTypes);
        setProfileMinimumHourlyRate(profile.minimumHourlyRate);
      }
    });
  }, []);

  useEffect(() => {
    const supabase = createClient();
    void supabase
      .from("analyses")
      .select(
        "id, company_name, job_title, job_description, fit_score, qualification_score, confidence_score, career_fit_adjustment, recommendation, recommendation_label, narrative_json, parsed_job_json, created_at",
      )
      .order("created_at", { ascending: false })
      .then(({ data }) => setAnalyses((data ?? []) as FullAnalysis[]));
  }, []);

  const rowA = analyses.find((x) => x.id === aId);
  const rowB = analyses.find((x) => x.id === bId);
  const resultA = rowA ? toResult(rowA) : null;
  const resultB = rowB ? toResult(rowB) : null;

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
    <>
      <IosLargeTitle
        title="Compare"
        subtitle="Pick two roles to compare side by side."
      />

      <div className="py-4 space-y-6">
        <IosGroupedSection title="Roles">
          <IosGroupedRow className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[13px] text-muted-foreground">Role A</Label>
              <select
                className="w-full h-11 text-[17px] bg-transparent"
                value={aId}
                onChange={(e) => setAId(e.target.value)}
              >
                <option value="">Select…</option>
                {analyses.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.job_title ?? "Job"} · {Math.round(x.fit_score ?? 0)} fit
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2 border-t border-border/60 pt-3">
              <Label className="text-[13px] text-muted-foreground">Role B</Label>
              <select
                className="w-full h-11 text-[17px] bg-transparent"
                value={bId}
                onChange={(e) => setBId(e.target.value)}
              >
                <option value="">Select…</option>
                {analyses.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.job_title ?? "Job"} · {Math.round(x.fit_score ?? 0)} fit
                  </option>
                ))}
              </select>
            </div>
          </IosGroupedRow>
        </IosGroupedSection>

        <div className="px-4">
          <Button
            variant="outline"
            className="w-full h-11 rounded-xl"
            disabled={busy}
            onClick={persistComparison}
          >
            Save comparison
          </Button>
        </div>

        {resultA ? (
          <div className="px-4 space-y-2">
            <p className="text-[13px] font-medium text-muted-foreground uppercase px-1">
              Role A
            </p>
            <AnalysisResultView
              result={resultA}
              profileDesiredCompensation={profileDesiredCompensation}
              profileQualifiedIndustries={profileQualifiedIndustries}
              profileQualifiedSkills={profileQualifiedSkills}
              profileCountry={profileCountry}
              profileTimezone={profileTimezone}
              profilePreferredCompanyTypes={profilePreferredCompanyTypes}
              profilePreferredMinimumEmployerRating={
                profilePreferredMinimumEmployerRating
              }
              profilePreferredRegions={profilePreferredRegions}
              profilePreferredProjectTypes={profilePreferredProjectTypes}
              profileMinimumHourlyRate={profileMinimumHourlyRate}
            />
          </div>
        ) : null}
        {resultB ? (
          <div className="px-4 pb-6 space-y-2">
            <p className="text-[13px] font-medium text-muted-foreground uppercase px-1">
              Role B
            </p>
            <AnalysisResultView
              result={resultB}
              profileDesiredCompensation={profileDesiredCompensation}
              profileQualifiedIndustries={profileQualifiedIndustries}
              profileQualifiedSkills={profileQualifiedSkills}
              profileCountry={profileCountry}
              profileTimezone={profileTimezone}
              profilePreferredCompanyTypes={profilePreferredCompanyTypes}
              profilePreferredMinimumEmployerRating={
                profilePreferredMinimumEmployerRating
              }
              profilePreferredRegions={profilePreferredRegions}
              profilePreferredProjectTypes={profilePreferredProjectTypes}
              profileMinimumHourlyRate={profileMinimumHourlyRate}
            />
          </div>
        ) : null}
      </div>
    </>
  );
}
