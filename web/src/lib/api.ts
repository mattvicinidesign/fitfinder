"use client";

import { createClient } from "@/lib/supabase/client";
import type { AnalysisResult, ParsedJob, ParsedResume } from "@/lib/types";

// Typed wrappers around the shared scoring/AI Edge Functions.
// The browser never computes scores; it calls these endpoints.

async function invoke<T>(
  name: string,
  body: Record<string, unknown>,
): Promise<T> {
  const supabase = createClient();
  const { data, error } = await supabase.functions.invoke<T>(name, { body });
  if (error) {
    // functions.invoke surfaces non-2xx as FunctionsHttpError, whose `context`
    // is the raw Response. Try to read the backend's `{ error }` message.
    let message = error.message;
    const context = (error as { context?: unknown }).context;
    if (context instanceof Response) {
      const payload = (await context
        .clone()
        .json()
        .catch(() => null)) as { error?: string } | null;
      if (payload?.error) message = payload.error;
    }
    throw new Error(message);
  }
  return data as T;
}

export function parseResume(
  resumeText: string,
  resumeId?: string,
): Promise<{ parsedResume: ParsedResume }> {
  return invoke("parse-resume", { resumeText, resumeId });
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

export function analyze(
  args: AnalyzeArgs,
): Promise<{ analysisId: string | null; result: AnalysisResult }> {
  return invoke("analyze", { ...args } as unknown as Record<string, unknown>);
}
