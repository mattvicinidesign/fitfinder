"use client";

import { cn } from "@/lib/utils";

/** Shown while waiting for resume parse to finish. */
export const ANALYSIS_PARSE_STATUS = "Parsing resume…";

export const ANALYSIS_PARSE_DETAIL =
  "Extracting skills, experience, and work history from your resume.";

export type AnalysisLoadingPhase = {
  status: string;
  detail: string;
  /** How long to keep this phase before advancing. */
  holdMs: number;
};

const FINAL_DETAIL_HOLD_MS = 2200;

/**
 * Timed phases during the analyze Edge Function call.
 * Server work is one request, so these communicate progress while it runs.
 * Once we reach "Building your report…", details keep cycling until done.
 */
export const ANALYSIS_ANALYZE_PHASES: AnalysisLoadingPhase[] = [
  {
    status: "Reading job description…",
    detail: "Pulling out role requirements, skills, and must-haves.",
    holdMs: 2400,
  },
  {
    status: "Comparing resume with job…",
    detail: "Matching your experience, skills, and background to the role.",
    holdMs: 3000,
  },
  {
    status: "Scoring fit categories…",
    detail:
      "Weighting Skills & Tools, Experience, Responsibilities, and Domain.",
    holdMs: 2800,
  },
  {
    status: "Building your report…",
    detail: "Summarizing matched, partial, and missing requirements.",
    holdMs: FINAL_DETAIL_HOLD_MS,
  },
  {
    status: "Building your report…",
    detail: "Calculating your overall Fit Score and recommendation.",
    holdMs: FINAL_DETAIL_HOLD_MS,
  },
  {
    status: "Building your report…",
    detail: "Assembling category scores into your final report.",
    holdMs: FINAL_DETAIL_HOLD_MS,
  },
  {
    status: "Building your report…",
    detail: "Highlighting strengths and gaps for this role.",
    holdMs: FINAL_DETAIL_HOLD_MS,
  },
  {
    status: "Building your report…",
    detail: "Packaging insights into a clear Fit Summary.",
    holdMs: FINAL_DETAIL_HOLD_MS,
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
    holdMs: FINAL_DETAIL_HOLD_MS,
  },
  {
    status: "Analyzing your resume…",
    detail: "Reviewing structure and formatting.",
    holdMs: FINAL_DETAIL_HOLD_MS,
  },
  {
    status: "Analyzing your resume…",
    detail: "Scoring ATS compatibility.",
    holdMs: FINAL_DETAIL_HOLD_MS,
  },
  {
    status: "Analyzing your resume…",
    detail: "Evaluating completeness and overall score.",
    holdMs: FINAL_DETAIL_HOLD_MS,
  },
  {
    status: "Analyzing your resume…",
    detail: "Preparing your resume score summary.",
    holdMs: FINAL_DETAIL_HOLD_MS,
  },
];

/**
 * Advance through loading phases. Returns a stop function.
 * After the first full pass, keeps looping phases that share the final status
 * so the last step never freezes on one line of copy.
 */
export function startLoadingPhaseRotation(
  phases: AnalysisLoadingPhase[],
  onPhase: (phase: Pick<AnalysisLoadingPhase, "status" | "detail">) => void,
): () => void {
  let index = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let cancelled = false;

  const finalStatus = phases[phases.length - 1]?.status;
  const loopStart =
    finalStatus == null
      ? -1
      : phases.findIndex((phase) => phase.status === finalStatus);

  const tick = () => {
    if (cancelled) return;
    const phase = phases[index];
    if (!phase) return;
    onPhase({ status: phase.status, detail: phase.detail });

    const holdMs = phase.holdMs > 0 ? phase.holdMs : FINAL_DETAIL_HOLD_MS;
    const atEnd = index >= phases.length - 1;

    if (!atEnd) {
      index += 1;
      timer = setTimeout(tick, holdMs);
      return;
    }

    if (loopStart >= 0 && loopStart < phases.length) {
      index = loopStart;
      timer = setTimeout(tick, holdMs);
    }
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
      <p
        key={detail}
        className="mt-2 max-w-[18rem] animate-in fade-in duration-300 text-center text-[14px] leading-snug text-muted-foreground"
      >
        {detail}
      </p>
    </div>
  );
}
