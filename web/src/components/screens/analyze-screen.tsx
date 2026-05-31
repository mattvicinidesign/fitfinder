"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Loader2, Maximize2, Minimize2 } from "lucide-react";
import { analyze } from "@/lib/api";
import {
  getLastAnalysisReport,
  saveAnalysisReport,
} from "@/lib/analysis-report-cache";
import { sanitizeJobText } from "@/lib/sanitize-job-text";
import {
  fetchProfileDesiredCompensation,
  fetchProfileQualifiedIndustries,
  fetchProfileCountry,
  fetchProfileTimezone,
} from "@/lib/profile-compensation";
import type { AnalysisResult, Compensation } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { IosLargeTitle } from "@/components/ui/ios-large-title";
import { AnalysisResultView } from "@/components/analysis-result";
import { ResumeFilePicker } from "@/components/resume-file-picker";
import {
  ANALYZE_FIELD_CLASS,
  ANALYZE_SECTION_CLASS,
  ANALYZE_SECTION_LABEL_CLASS,
} from "@/components/analyze-form-styles";
import { waitForResumeParse } from "@/lib/resume-upload";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { SkeletonAnalysisReport, SkeletonPrimitive } from "@/components/ui/skeletons";

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

  const [resumeId, setResumeId] = useState<string | undefined>(undefined);
  const [resumeFileName, setResumeFileName] = useState<string | null>(null);
  const [jobText, setJobText] = useState("");
  const [jobLink, setJobLink] = useState("");
  const [jobExpanded, setJobExpanded] = useState(false);

  const [status, setStatus] = useState<string | null>(null);
  const [profileDesiredCompensation, setProfileDesiredCompensation] =
    useState<Compensation | null>(null);
  const [profileQualifiedIndustries, setProfileQualifiedIndustries] = useState<
    string[]
  >([]);
  const [profileCountry, setProfileCountry] = useState<string | null>(null);
  const [profileTimezone, setProfileTimezone] = useState<string | null>(null);
  const [lastReport, setLastReport] = useState<{
    reportId: string;
    roleTitle: string;
  } | null>(null);

  const busy = status !== null;

  useEffect(() => {
    if (demo) return;
    setLastReport(getLastAnalysisReport());
  }, [demo]);

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

  async function run(e: React.FormEvent) {
    e.preventDefault();
    if (demo) return;
    if (!resumeId) {
      toast.error("Upload your resume to continue.");
      return;
    }
    const trimmedLink = jobLink.trim();
    if (!jobText.trim() && !trimmedLink) {
      toast.error("Paste a job description or link to analyze.");
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
      const jobContent = [
        cleaned.text,
        trimmedLink ? `Job posting link: ${trimmedLink}` : "",
      ]
        .filter(Boolean)
        .join("\n\n");
      setStatus("Parsing resume…");
      await waitForResumeParse(resumeId);
      setStatus("Scoring fit…");
      const { analysisId, result } = await analyze({
        jobText: jobContent,
        resumeId,
      });
      const reportId = analysisId ?? crypto.randomUUID();
      saveAnalysisReport(reportId, {
        result: {
          ...result,
          jobDescription: result.jobDescription ?? jobContent,
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
    <div className="relative flex h-full min-h-0 flex-col">
      {demo ? (
        <p className="mx-4 mt-2 text-center text-[13px] font-medium text-primary">
          Fit Finder Preview — canonical UI (sample data)
        </p>
      ) : (
        <header className="sticky top-0 z-10 shrink-0 bg-background px-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2.5">
          <div className="flex items-center justify-between gap-3">
            <Link
              href="/home"
              aria-label="Back to Home"
              className="-ml-1.5 inline-flex items-center rounded-md p-1 text-primary transition-colors hover:bg-primary/10"
            >
              <ChevronLeft className="size-5 shrink-0" aria-hidden />
            </Link>
            {lastReport ? (
              <Link
                href={`/analyze/report?id=${encodeURIComponent(lastReport.reportId)}`}
                aria-label={`${lastReport.roleTitle} report`}
                className="-mr-1.5 inline-flex min-w-0 max-w-[58%] items-center gap-0.5 rounded-md py-1 pr-1 pl-2 text-[15px] font-medium text-primary transition-colors hover:bg-primary/10"
              >
                <span className="truncate">{lastReport.roleTitle}</span>
                <span className="shrink-0">Report</span>
                <ChevronRight className="size-5 shrink-0" aria-hidden />
              </Link>
            ) : null}
          </div>
        </header>
      )}
      <IosLargeTitle
        title="Analyze"
        subtitle="Upload your resume and paste a job to score your fit."
      />

      <form onSubmit={run} className="flex min-h-0 flex-1 flex-col overflow-hidden py-4">
        <section
          className={cn(
            ANALYZE_SECTION_CLASS,
            jobExpanded ? "hidden" : "flex-1",
          )}
        >
          <h2 className={ANALYZE_SECTION_LABEL_CLASS}>Resume</h2>
          {!demo ? (
            <ResumeFilePicker
              className="min-h-0 flex-1"
              disabled={busy}
              fileName={resumeFileName}
              onParsed={({ resumeId, fileName }) => {
                setResumeId(resumeId);
                setResumeFileName(fileName);
              }}
            />
          ) : (
            <div
              className={cn(
                ANALYZE_FIELD_CLASS,
                "flex min-h-0 flex-1 flex-col items-center justify-center py-8 text-center",
              )}
            >
              Sample resume (preview mode)
            </div>
          )}
        </section>

        <section
          className={cn(
            ANALYZE_SECTION_CLASS,
            "mt-4",
            jobExpanded ? "flex-1" : "flex-[1.15]",
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className={ANALYZE_SECTION_LABEL_CLASS}>Job description</h2>
            <button
              type="button"
              onClick={() => setJobExpanded((v) => !v)}
              className="inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[13px] font-medium text-primary transition-colors hover:bg-primary/10"
            >
              {jobExpanded ? (
                <>
                  <Minimize2 className="size-3.5" aria-hidden />
                  Collapse
                </>
              ) : (
                <>
                  <Maximize2 className="size-3.5" aria-hidden />
                  Expand
                </>
              )}
            </button>
          </div>
          <Label htmlFor="job" className="sr-only">
            Job description
          </Label>
          <Textarea
            id="job"
            placeholder="Paste the job description…"
            value={jobText}
            onChange={(e) => setJobText(e.target.value)}
            className={cn(
              ANALYZE_FIELD_CLASS,
              "min-h-[140px] resize-none overflow-y-auto dark:bg-muted/40",
              jobExpanded
                ? "field-sizing-content"
                : "field-sizing-fixed flex-1",
            )}
          />
        </section>

        <section className={cn(ANALYZE_SECTION_CLASS, "mt-4")}>
          <h2 className={ANALYZE_SECTION_LABEL_CLASS}>Job link</h2>
          <Label htmlFor="job-link" className="sr-only">
            Job link (optional)
          </Label>
          <input
            id="job-link"
            type="url"
            inputMode="url"
            placeholder="Paste a job link (optional)"
            value={jobLink}
            onChange={(e) => setJobLink(e.target.value)}
            className={ANALYZE_FIELD_CLASS}
          />
        </section>

        <div className="px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button
            type="submit"
            className="w-full h-12 gap-2 text-[17px] rounded-xl"
            disabled={busy || demo}
          >
            {busy ? (
              <>
                <Loader2 className="size-5 animate-spin" aria-hidden />
                {status}
              </>
            ) : (
              "Analyze fit"
            )}
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

      {busy ? (
        <div
          className="absolute inset-0 z-20 flex flex-col overflow-y-auto bg-background"
          aria-busy="true"
          aria-label="Generating analysis report"
        >
          <div className="sticky top-0 z-10 shrink-0 border-b border-border/60 bg-background px-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-3">
            <SkeletonPrimitive className="h-4 w-40" />
            <p className="mt-2 text-[13px] text-muted-foreground">{status}</p>
          </div>
          <SkeletonAnalysisReport />
        </div>
      ) : null}
    </div>
  );
}
