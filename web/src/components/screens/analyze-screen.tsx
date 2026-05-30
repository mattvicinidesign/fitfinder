"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { analyze } from "@/lib/api";
import { saveAnalysisReport } from "@/lib/analysis-report-cache";
import { sanitizeJobText } from "@/lib/sanitize-job-text";
import {
  fetchProfileDesiredCompensation,
  fetchProfileQualifiedIndustries,
  fetchProfileCountry,
  fetchProfileTimezone,
} from "@/lib/profile-compensation";
import { ensureProfileQualifications } from "@/lib/qa";
import {
  ensureQaRegisteredAccount,
  getQaPreloadedResumeLocal,
  isQaRegisteredScoring,
  preloadQaResume,
  QA_PRELOAD_RESUME_NAME,
  refreshQaResume,
} from "@/lib/qa";
import type { AnalysisResult, Compensation } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { IosLargeTitle } from "@/components/ui/ios-large-title";
import {
  IosGroupedRow,
  IosGroupedSection,
} from "@/components/ui/ios-grouped-section";
import { AnalysisResultView } from "@/components/analysis-result";
import { ResumeFilePicker } from "@/components/resume-file-picker";
import { toast } from "sonner";

const DEMO_RESULT: AnalysisResult = {
  companyName: null,
  jobTitle: null,
  parsedJob: {
    skills: ["TypeScript", "React"],
    industries: ["SaaS"],
    workflows: [],
    compensation: null,
    toolRequirements: ["Docker"],
    aiRequirements: [],
  },
  score: {
    qualificationScore: 82,
    confidenceScore: 72,
    careerFitAdjustment: 7,
    fitScore: 89,
    recommendation: "strong_apply",
    recommendationLabel: "Highly Recommended",
    scoringMode: "registered",
    categoryBreakdown: [
      {
        category: "skills",
        label: "Skills",
        status: "match",
        score: 90,
        weight: 25,
        contribution: 22.5,
        matchedCount: 9,
        totalCount: 10,
      },
      {
        category: "industry",
        label: "Industry",
        status: "match",
        score: 85,
        weight: 18,
        contribution: 15.3,
      },
    ],
    unknownCategories: ["Tools", "Compensation"],
    explanation:
      "Qualification 82% from scored categories. Career fit adjustment +7 → final fit 89%.",
    strengths: ["Skills: strong alignment (90%)."],
    gaps: [],
    positiveSignalsFound: ["enterprise saas", "analytics"],
    negativeSignalsFound: [],
  },
  narrative: {
    strengths: ["Strong stack overlap with the role"],
    gaps: ["Limited explicit AI production experience"],
    recommendations: ["Highlight recent TypeScript projects in your cover letter"],
    positiveSignals: ["Fintech background matches the team"],
    negativeSignals: [],
  },
  postingContext: {
    employerType: "product_company",
    hireTarget: "freelancer",
    label: "Product company hiring a Freelancer",
    detail: null,
    engagementDuration: "ongoing",
    engagementPath: "contract",
    payStructure: "hourly",
    badges: ["Ongoing", "Contract", "Hourly"],
  },
};

export function AnalyzeScreen({ demo = false }: { demo?: boolean }) {
  const router = useRouter();
  const qaRegistered = isQaRegisteredScoring();
  const qaCached = !demo && qaRegistered ? getQaPreloadedResumeLocal() : null;

  const [resumeId, setResumeId] = useState<string | undefined>(
    () => qaCached?.resumeId,
  );
  const [resumeFileName, setResumeFileName] = useState<string | null>(
    () => qaCached?.fileName ?? null,
  );
  const [resumePreloading, setResumePreloading] = useState(
    () => qaRegistered && !qaCached?.resumeId,
  );
  const [qaRefreshing, setQaRefreshing] = useState(false);
  const [jobText, setJobText] = useState("");

  const [status, setStatus] = useState<string | null>(null);
  const [profileDesiredCompensation, setProfileDesiredCompensation] =
    useState<Compensation | null>(null);
  const [profileQualifiedIndustries, setProfileQualifiedIndustries] = useState<
    string[]
  >([]);
  const [profileCountry, setProfileCountry] = useState<string | null>(null);
  const [profileTimezone, setProfileTimezone] = useState<string | null>(null);

  const busy = status !== null;

  useEffect(() => {
    if (demo) return;
    void Promise.all([
      fetchProfileDesiredCompensation(),
      fetchProfileQualifiedIndustries(),
      fetchProfileCountry(),
      fetchProfileTimezone(),
    ]).then(([pay, industries, country, timezone]) => {
      setProfileDesiredCompensation(pay);
      setProfileQualifiedIndustries(industries);
      setProfileCountry(country);
      setProfileTimezone(timezone);
    });
  }, [demo]);

  useEffect(() => {
    if (demo || !qaRegistered) return;

    let cancelled = false;

    (async () => {
      try {
        const loaded = await preloadQaResume();
        if (cancelled || !loaded) return;
        setResumeId(loaded.resumeId);
        setResumeFileName(loaded.fileName);
      } catch (err) {
        if (!cancelled) {
          toast.error(
            err instanceof Error ? err.message : "QA resume preload failed.",
          );
        }
      } finally {
        if (!cancelled) setResumePreloading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [demo, qaRegistered]);

  async function handleQaRefreshResume() {
    setQaRefreshing(true);
    setResumePreloading(true);
    try {
      const loaded = await refreshQaResume();
      if (!loaded) {
        toast.error("Sign in required to refresh QA resume.");
        return;
      }
      setResumeId(loaded.resumeId);
      setResumeFileName(loaded.fileName);
      toast.success("QA resume re-uploaded and parsed.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "QA resume refresh failed.",
      );
    } finally {
      setQaRefreshing(false);
      setResumePreloading(false);
    }
  }

  async function run(e: React.FormEvent) {
    e.preventDefault();
    if (demo) return;
    if (!resumeId) {
      toast.error("Upload your resume to continue.");
      return;
    }
    if (!jobText.trim()) {
      toast.error("Paste a job description to analyze.");
      return;
    }
    try {
      const cleaned = sanitizeJobText(jobText);
      if (cleaned.removedFooter || cleaned.trimmed) {
        setJobText(cleaned.text);
        toast.message(
          cleaned.removedFooter
            ? "Removed Upwork page footer from job text."
            : "Trimmed job text to analysis limit.",
        );
      }
      if (qaRegistered) {
        await ensureQaRegisteredAccount();
        await ensureProfileQualifications();
        const industries = await fetchProfileQualifiedIndustries();
        setProfileQualifiedIndustries(industries);
      }
      setStatus("Scoring fit…");
      const { analysisId, result } = await analyze({
        jobText: cleaned.text,
        resumeId,
        ...(qaRegistered ? { scoringMode: "registered" as const } : {}),
      });
      const reportId = analysisId ?? crypto.randomUUID();
      saveAnalysisReport(reportId, {
        result: {
          ...result,
          jobDescription: result.jobDescription ?? cleaned.text,
        },
        analysisId,
        profileDesiredCompensation,
        profileQualifiedIndustries,
        profileCountry,
        profileTimezone,
      });
      toast.success("Analysis complete and saved.");
      router.push(`/analyze/report?id=${encodeURIComponent(reportId)}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Analysis failed.");
    } finally {
      setStatus(null);
    }
  }

  return (
    <>
      {demo ? (
        <p className="mx-4 mt-2 text-center text-[13px] font-medium text-primary">
          Fit Finder Preview — canonical UI (sample data)
        </p>
      ) : null}
      {qaRegistered && !demo ? (
        <div className="mx-4 mt-2 flex flex-col items-center gap-2 text-center text-[13px] font-medium text-amber-700 dark:text-amber-500">
          <p>
            QA mode — registered scoring · resume preloads as{" "}
            {QA_PRELOAD_RESUME_NAME}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-[12px] rounded-lg border-amber-600/40 text-amber-800 dark:text-amber-400"
            disabled={busy || resumePreloading || qaRefreshing}
            onClick={() => void handleQaRefreshResume()}
          >
            {qaRefreshing || resumePreloading
              ? "Re-uploading QA resume…"
              : "Re-upload QA resume (refresh cache)"}
          </Button>
        </div>
      ) : null}
      <IosLargeTitle
        title="Analyze"
        subtitle="Upload your resume, paste a job description, and get a global score."
      />

      <form onSubmit={run} className="py-4 space-y-6">
        <IosGroupedSection
          title="Resume"
          footer="PDF, Word (.doc, .docx), or plain text (.txt)."
        >
          <IosGroupedRow className="space-y-3">
            {!demo ? (
              <>
                <ResumeFilePicker
                  disabled={busy || resumePreloading || qaRefreshing}
                  fileName={resumeFileName}
                  onParsed={({ resumeId, fileName }) => {
                    setResumeId(resumeId);
                    setResumeFileName(fileName);
                  }}
                />
                {resumePreloading ? (
                  <p className="text-[13px] text-muted-foreground">
                    Loading QA resume…
                  </p>
                ) : null}
              </>
            ) : (
              <p className="text-[15px] text-muted-foreground">
                Sample resume (preview mode)
              </p>
            )}
          </IosGroupedRow>
        </IosGroupedSection>

        <IosGroupedSection title="Job description">
          <IosGroupedRow>
            <div className="space-y-2 w-full">
              <Label htmlFor="job" className="sr-only">
                Job description
              </Label>
              <Textarea
                id="job"
                rows={8}
                placeholder="Paste the job description…"
                value={jobText}
                onChange={(e) => setJobText(e.target.value)}
                required={!demo}
                className="text-[17px] bg-transparent border-0 shadow-none px-0 resize-none focus-visible:ring-0 min-h-[180px]"
              />
            </div>
          </IosGroupedRow>
        </IosGroupedSection>

        <div className="px-4">
          <Button type="submit" className="w-full h-12 text-[17px] rounded-xl" disabled={busy || demo}>
            {status ?? "Analyze fit"}
          </Button>
        </div>
      </form>

      {demo ? (
        <div className="px-4 pb-6">
          <p className="text-[13px] text-muted-foreground text-center mb-4">
            Preview uses sample data on the report page after you tap Analyze fit
            (disabled here).{" "}
            <button
              type="button"
              className="text-primary underline-offset-2 hover:underline"
              onClick={() => {
                saveAnalysisReport("demo", {
                  result: DEMO_RESULT,
                  analysisId: null,
                });
                router.push("/analyze/report?id=demo");
              }}
            >
              View sample report
            </button>
          </p>
        </div>
      ) : null}
    </>
  );
}
