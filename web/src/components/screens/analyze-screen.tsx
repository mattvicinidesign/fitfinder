"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Maximize2, Minimize2 } from "lucide-react";
import { CircleBackLink } from "@/components/ui/circle-back-button";
import { analyze } from "@/lib/api";
import {
  getLastAnalysisReport,
  saveAnalysisReport,
} from "@/lib/analysis-report-cache";
import { sanitizeJobText } from "@/lib/sanitize-job-text";
import {
  fetchProfileDesiredCompensation,
  fetchProfileQualifiedIndustries,
  fetchProfileQualifiedSkills,
  fetchProfileCountry,
  fetchProfileTimezone,
} from "@/lib/profile-compensation";
import { fetchUserProfile } from "@/lib/profile";
import { loadLocalProfilePrefs } from "@/lib/local-profile-prefs";
import type { AnalysisResult, Compensation } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { CtaSpinner } from "@/components/ui/cta-spinner";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AnalysisResultView } from "@/components/analysis-result";
import {
  ResumeFilePicker,
  type ResumeFilePickerHandle,
} from "@/components/resume-file-picker";
import { REPLACE_RESUME_BUTTON_CLASS } from "@/components/resume-upload-styles";
import {
  ANALYZE_FIELD_CLASS,
  ANALYZE_SECTION_CLASS,
  ANALYZE_SECTION_LABEL_CLASS,
} from "@/components/analyze-form-styles";
import { waitForResumeParse, getCachedParsedResume } from "@/lib/resume-parse-tracker";
import { fetchLatestUserResume } from "@/lib/resume-documents";
import { ReportLink } from "@/components/report-link";
import { openAnalysisReport } from "@/lib/report-return";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { AnalysisLoadingOverlay } from "@/components/analysis-loading-overlay";
import {
  screenShellClass,
  StickyBottomCta,
  StickyScreenBody,
  StickyScreenHeader,
} from "@/components/ui/sticky-bottom-cta";
import { safeTopCompact } from "@/lib/safe-area";

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
    recommendationLabel: "Strong Pursuit",
    scoringMode: "registered",
    categoryBreakdown: [],
    opportunityCategories: [
      {
        category: "roleAlignment",
        label: "Role Alignment",
        score: 92,
        weight: 35,
        contribution: 32.2,
      },
      {
        category: "qualificationsMatch",
        label: "Qualifications",
        score: 88,
        weight: 30,
        contribution: 26.4,
        matchedCount: 9,
        totalCount: 10,
      },
      {
        category: "industryAlignment",
        label: "Industry Alignment",
        score: 85,
        weight: 15,
        contribution: 12.8,
      },
      {
        category: "preferenceAlignment",
        label: "Preference Alignment",
        score: 72,
        weight: 10,
        contribution: 7.2,
      },
      {
        category: "clientQuality",
        label: "About Client",
        score: 78,
        weight: 10,
        contribution: 7.8,
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
    badges: ["Contract", "Hourly"],
  },
};

export function AnalyzeScreen({ demo = false }: { demo?: boolean }) {
  const router = useRouter();
  const resumePickerRef = useRef<ResumeFilePickerHandle>(null);

  const [resumeId, setResumeId] = useState<string | undefined>(undefined);
  const [resumeFileName, setResumeFileName] = useState<string | null>(null);
  const [jobText, setJobText] = useState("");
  const [jobExpanded, setJobExpanded] = useState(false);

  const [status, setStatus] = useState<string | null>(null);
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
    useState<string[]>(() => loadLocalProfilePrefs()?.preferredCompanyTypes ?? []);
  const [profilePreferredMinimumEmployerRating, setProfilePreferredMinimumEmployerRating] =
    useState<number | null>(
      () => loadLocalProfilePrefs()?.preferredMinimumEmployerRating ?? null,
    );
  const [profilePreferredRegions, setProfilePreferredRegions] = useState<string[]>(
    () => loadLocalProfilePrefs()?.preferredRegions ?? [],
  );
  const [profilePreferredProjectTypes, setProfilePreferredProjectTypes] =
    useState<string[]>(() => loadLocalProfilePrefs()?.preferredProjectTypes ?? []);
  const [profileMinimumHourlyRate, setProfileMinimumHourlyRate] = useState<number | null>(
    () => loadLocalProfilePrefs()?.minimumHourlyRate ?? null,
  );
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
    void fetchLatestUserResume().then((resume) => {
      if (!resume) return;
      setResumeId((current) => current ?? resume.id);
      setResumeFileName((current) => current ?? resume.fileName);
    });
  }, [demo]);

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
      const jobContent = cleaned.text;
      setStatus("Parsing resume…");
      await waitForResumeParse(resumeId);
      const parsedResume = getCachedParsedResume(resumeId);
      setStatus("Scoring fit…");
      const { analysisId, result } = await analyze({
        jobText: jobContent,
        resumeId,
        ...(parsedResume ? { parsedResume } : {}),
      });
      const reportId = analysisId ?? crypto.randomUUID();
      const profile = await fetchUserProfile();
      saveAnalysisReport(reportId, {
        result: {
          ...result,
          jobDescription: result.jobDescription ?? jobContent,
        },
        analysisId,
        resumeId,
        profileDesiredCompensation,
        profileQualifiedIndustries,
        profileQualifiedSkills,
        profileCountry,
        profileTimezone,
        profilePreferredCompanyTypes:
          profile?.preferredCompanyTypes ?? profilePreferredCompanyTypes,
        profilePreferredMinimumEmployerRating:
          profile?.preferredMinimumEmployerRating ??
          profilePreferredMinimumEmployerRating,
        profilePreferredRegions:
          profile?.preferredRegions ?? profilePreferredRegions,
        profilePreferredProjectTypes:
          profile?.preferredProjectTypes ?? profilePreferredProjectTypes,
        profileMinimumHourlyRate:
          profile?.minimumHourlyRate ?? profileMinimumHourlyRate,
      });
      toast.success("Analysis complete and saved.");
      openAnalysisReport(reportId, "/analyze", router);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Analysis failed.");
    } finally {
      setStatus(null);
    }
  }

  return (
    <div className={screenShellClass}>
      {demo ? (
        <p className="mx-4 mt-2 shrink-0 text-center text-[13px] font-medium text-primary">
          Fit Finder Preview — canonical UI (sample data)
        </p>
      ) : (
        <StickyScreenHeader className={`px-4 pb-3 ${safeTopCompact}`}>
          <div className="flex items-center justify-between gap-3 pb-2">
            <CircleBackLink href="/home" aria-label="Back to Home" />
            {lastReport ? (
              <ReportLink
                reportId={lastReport.reportId}
                from="/analyze"
                aria-label={`${lastReport.roleTitle} report`}
                className="-mr-1.5 inline-flex min-w-0 max-w-[58%] items-center gap-0.5 rounded-md py-1 pr-1 pl-2 text-[15px] font-medium text-primary transition-colors hover:bg-primary/10"
              >
                <span className="truncate">{lastReport.roleTitle}</span>
                <span className="shrink-0">Report</span>
                <ChevronRight className="size-5 shrink-0" aria-hidden />
              </ReportLink>
            ) : null}
          </div>
          <div className="flex items-center justify-between gap-3">
            <h1 className="min-w-0 text-[34px] font-bold leading-tight tracking-tight">
              Analyze
            </h1>
            {resumeFileName ? (
              <button
                type="button"
                onClick={() => resumePickerRef.current?.openFilePicker()}
                disabled={busy}
                className={REPLACE_RESUME_BUTTON_CLASS}
              >
                Replace Resume
              </button>
            ) : null}
          </div>
        </StickyScreenHeader>
      )}

      <form
        onSubmit={run}
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
      >
        <StickyScreenBody className="py-4 pb-24">
        <section
          className={cn(
            ANALYZE_SECTION_CLASS,
            jobExpanded ? "hidden" : "flex-1",
          )}
        >
          <h2 className={ANALYZE_SECTION_LABEL_CLASS}>Resume</h2>
          {!demo ? (
            <ResumeFilePicker
              ref={resumePickerRef}
              className="min-h-0 flex-1"
              disabled={busy}
              fileName={resumeFileName}
              showReplaceHint={false}
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

          {demo ? (
            <div className="px-4 pb-2">
              <p className="text-[13px] text-muted-foreground text-center mb-4">
                Preview uses sample data on the report page after you tap Analyze fit
                (disabled here).{" "}
                <button
                  type="button"
                  className="text-primary underline-offset-2 hover:underline"
                  onClick={() => {
                    const prefs = loadLocalProfilePrefs();
                    saveAnalysisReport("demo", {
                      result: DEMO_RESULT,
                      analysisId: null,
                      profilePreferredCompanyTypes:
                        prefs?.preferredCompanyTypes ?? ["Company"],
                      profilePreferredMinimumEmployerRating:
                        prefs?.preferredMinimumEmployerRating ?? 5,
                      profilePreferredRegions:
                        prefs?.preferredRegions ?? ["United States"],
                      profilePreferredProjectTypes:
                        prefs?.preferredProjectTypes ?? ["Ongoing"],
                      profileMinimumHourlyRate: prefs?.minimumHourlyRate ?? 100,
                    });
                    openAnalysisReport("demo", "/analyze", router);
                  }}
                >
                  View sample report
                </button>
              </p>
            </div>
          ) : null}
        </StickyScreenBody>

        <StickyBottomCta variant="floating" scrollFade>
          <Button
            type="submit"
            className="h-12 w-full gap-2 rounded-xl text-[17px] font-semibold shadow-[0_8px_28px_rgba(0,0,0,0.45)]"
            disabled={busy || demo}
            aria-busy={busy}
            aria-label={busy ? status ?? "Analyzing fit" : "Analyze fit"}
          >
            {busy ? <CtaSpinner /> : "Analyze fit"}
          </Button>
        </StickyBottomCta>
      </form>

      {busy && status ? <AnalysisLoadingOverlay status={status} /> : null}
    </div>
  );
}
