"use client";

import { cn } from "@/lib/utils";

/** Shown while waiting for resume parse to finish. */
export const ANALYSIS_PARSE_STATUS = "Parsing resume…";

export const ANALYSIS_PARSE_DETAIL =
  "Extracting skills, experience, and work history from your resume.";

export type AnalysisLoadingPhase = {
  status: string;
  detail: string;
  /** How long to keep this phase before advancing (last phase holds until done). */
  holdMs: number;
};

/**
 * Timed phases during the analyze Edge Function call.
 * Server work is one request, so these communicate progress while it runs.
 * The final step keeps one header and rotates subtext.
 */
export const ANALYSIS_ANALYZE_PHASES: AnalysisLoadingPhase[] = [
  {
    status: "Reading job description…",
    detail: "Pulling out role requirements, skills, and must-haves.",
    holdMs: 3200,
  },
  {
    status: "Comparing resume with job…",
    detail: "Matching your experience, skills, and background to the role.",
    holdMs: 4800,
  },
  {
    status: "Scoring fit categories…",
    detail:
      "Weighting Skills & Tools, Experience, Responsibilities, and Domain.",
    holdMs: 4200,
  },
  {
    status: "Building your report…",
    detail: "Summarizing matched, partial, and missing requirements.",
    holdMs: 2800,
  },
  {
    status: "Building your report…",
    detail: "Calculating your overall Fit Score and recommendation.",
    holdMs: 2800,
  },
  {
    status: "Building your report…",
    detail: "Assembling category scores into your final report.",
    holdMs: 0,
  },
];

/**
 * Timed phases while resume score / review runs.
 * Header stays fixed; subtext cycles through scoring steps.
 */
export const RESUME_REVIEW_LOADING_PHASES: AnalysisLoadingPhase[] = [
  {
    status: "Analyzing your resume…",
    detail: "Checking content and clarity.",
    holdMs: 2800,
  },
  {
    status: "Analyzing your resume…",
    detail: "Reviewing structure and formatting.",
    holdMs: 2800,
  },
  {
    status: "Analyzing your resume…",
    detail: "Scoring ATS compatibility.",
    holdMs: 2800,
  },
  {
    status: "Analyzing your resume…",
    detail: "Evaluating completeness and overall score.",
    holdMs: 0,
  },
];

/**
 * Advance through loading phases. Returns a stop function.
 */
export function startLoadingPhaseRotation(
  phases: AnalysisLoadingPhase[],
  onPhase: (phase: Pick<AnalysisLoadingPhase, "status" | "detail">) => void,
): () => void {
  let index = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let cancelled = false;

  const tick = () => {
    if (cancelled) return;
    const phase = phases[index];
    if (!phase) return;
    onPhase({ status: phase.status, detail: phase.detail });
    if (index >= phases.length - 1 || phase.holdMs <= 0) {
      return;
    }
    index += 1;
    timer = setTimeout(tick, phase.holdMs);
  };

  tick();

  return () => {
    cancelled = true;
    if (timer) clearTimeout(timer);
  };
}

/**
 * Advance through analyze-phase titles/details while the Edge Function runs.
 * Returns a stop function — call it when analyze finishes or fails.
 */
export function startAnalysisPhaseRotation(
  onPhase: (phase: Pick<AnalysisLoadingPhase, "status" | "detail">) => void,
): () => void {
  return startLoadingPhaseRotation(ANALYSIS_ANALYZE_PHASES, onPhase);
}

/**
 * Advance through resume-score loading details while review runs.
 */
export function startResumeReviewPhaseRotation(
  onPhase: (phase: Pick<AnalysisLoadingPhase, "status" | "detail">) => void,
): () => void {
  return startLoadingPhaseRotation(RESUME_REVIEW_LOADING_PHASES, onPhase);
}

export function AnalysisLoadingOverlay({
  status,
  detail,
  className,
}: {
  status: string;
  detail: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "absolute inset-0 z-30 flex flex-col items-center justify-center bg-background px-8",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={status}
    >
      <div className="relative size-14" aria-hidden>
        <div className="absolute inset-0 rounded-full border-[3px] border-primary/15" />
        <div className="absolute inset-0 animate-spin rounded-full border-[3px] border-transparent border-t-primary" />
      </div>
      <p className="mt-6 text-center text-[18px] font-semibold text-foreground">
        {status}
      </p>
      <p className="mt-2 max-w-[18rem] text-center text-[14px] leading-snug text-muted-foreground">
        {detail}
      </p>
    </div>
  );
}
