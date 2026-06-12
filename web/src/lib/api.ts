"use client";

/**
 * Shared API layer — all product clients call the Supabase Edge Functions here.
 * Scoring, parsing, and narrative generation live only on the backend
 * (`supabase/functions/_shared/`). Never duplicate that logic in UI code.
 */

import { invokeFunction } from "@/lib/invoke-function";
import { normalizeAnalysisResult } from "@/lib/normalize-score";
import type { AnalysisResult, ParsedJob, ParsedResume } from "@/lib/types";

const ANALYZE_TIMEOUT_MS = 120_000;
const DEFAULT_TIMEOUT_MS = 90_000;

async function invoke<T>(
  name: string,
  body: Record<string, unknown>,
): Promise<T> {
  const timeoutMs = name === "analyze" ? ANALYZE_TIMEOUT_MS : DEFAULT_TIMEOUT_MS;
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
