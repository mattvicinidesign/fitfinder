"use client";

/**
 * Shared API layer — all product clients call the Supabase Edge Functions here.
 * Scoring, parsing, and narrative generation live only on the backend
 * (`supabase/functions/_shared/`). Never duplicate that logic in UI code.
 */

import { invokeFunction } from "@/lib/invoke-function";
import { normalizeAnalysisResult } from "@/lib/normalize-score";
import type {
  AnalysisResult,
  AtsKeywordOptimization,
  ParsedJob,
  ParsedResume,
  ProposalGeneration,
  ResumeReviewResult,
} from "@/lib/types";

const ANALYZE_TIMEOUT_MS = 120_000;
const DEFAULT_TIMEOUT_MS = 90_000;
const LONG_AI_TIMEOUT_MS = 120_000;

const LONG_AI_FUNCTIONS = new Set(["analyze", "generate-proposal", "review-resume"]);

async function invoke<T>(
  name: string,
  body: Record<string, unknown>,
): Promise<T> {
  const timeoutMs = LONG_AI_FUNCTIONS.has(name)
    ? name === "analyze"
      ? ANALYZE_TIMEOUT_MS
      : LONG_AI_TIMEOUT_MS
    : DEFAULT_TIMEOUT_MS;
  try {
    return await invokeFunction<T>(name, body, timeoutMs);
  } catch (e) {
    if (e instanceof Error && e.message === "Request timed out. Try again.") {
      throw new Error(
        name === "analyze"
          ? "Analysis timed out. Shorten the job description and try again."
          : e.message,
      );
    }
    if (
      e instanceof Error &&
      e.message === "Could not reach the server. Check your connection and try again."
    ) {
      throw new Error(
        "Could not reach the analysis service. Check your connection and try again.",
      );
    }
    throw e;
  }
}

export type ParseResumeArgs =
  | { resumeText: string; resumeId?: string }
  | { resumeId: string };

export function parseResume(
  args: ParseResumeArgs,
): Promise<{ parsedResume: ParsedResume }> {
  return invoke("parse-resume", args as unknown as Record<string, unknown>);
}

export function parseJob(jobText: string): Promise<{ parsedJob: ParsedJob }> {
  return invoke("parse-job", { jobText });
}

export interface AnalyzeArgs {
  jobText: string;
  companyName?: string;
  jobTitle?: string;
  resumeId?: string;
  parsedResume?: ParsedResume;
  persist?: boolean;
}

export async function analyze(
  args: AnalyzeArgs,
): Promise<{ analysisId: string | null; result: AnalysisResult }> {
  const data = await invoke<{ analysisId: string | null; result: unknown }>(
    "analyze",
    { ...args } as unknown as Record<string, unknown>,
  );
  return {
    analysisId: data.analysisId ?? null,
    result: normalizeAnalysisResult(data.result),
  };
}

export interface GenerateProposalArgs {
  parsedResume?: ParsedResume | null;
  parsedJob: ParsedJob;
  jobDescription?: string | null;
  jobTitle?: string | null;
  companyName?: string | null;
  strengths?: string[];
  gaps?: string[];
  candidateName?: string | null;
  portfolioUrl?: string | null;
  reportId?: string | null;
  resumeId?: string | null;
  resumeText?: string | null;
}

export async function generateProposal(
  args: GenerateProposalArgs,
): Promise<ProposalGeneration> {
  const data = await invoke<{ proposal: ProposalGeneration }>(
    "generate-proposal",
    { ...args } as unknown as Record<string, unknown>,
  );
  return data.proposal;
}

export interface ReviewResumeArgs {
  resumeId?: string;
  resumeText?: string;
  parsedResume?: ParsedResume | null;
}

export async function reviewResume(
  args: ReviewResumeArgs,
): Promise<ResumeReviewResult> {
  const data = await invoke<{ review: ResumeReviewResult }>(
    "review-resume",
    { ...args } as unknown as Record<string, unknown>,
  );
  return data.review;
}

export interface OptimizeAtsKeywordsArgs {
  resumeId?: string | null;
  resumeText?: string | null;
  originalATSScore: number;
}

export async function optimizeAtsKeywords(
  args: OptimizeAtsKeywordsArgs,
): Promise<
  Omit<
    AtsKeywordOptimization,
    "keywordChangeDecisions" | "completedAt" | "improvementDismissed"
  >
> {
  const data = await invoke<{ optimization: AtsKeywordOptimization }>(
    "optimize-ats-keywords",
    {
      resumeId: args.resumeId ?? undefined,
      resumeText: args.resumeText ?? undefined,
      originalATSScore: args.originalATSScore,
    },
  );
  return data.optimization;
}
