"use client";

/**
 * Shared API layer — all product clients call the Supabase Edge Functions here.
 * Scoring, parsing, and narrative generation live only on the backend
 * (`supabase/functions/_shared/`). Never duplicate that logic in UI code.
 */

import { createClient } from "@/lib/supabase/client";
import { normalizeAnalysisResult } from "@/lib/normalize-score";
import type { AnalysisResult, ParsedJob, ParsedResume } from "@/lib/types";

async function invoke<T>(
  name: string,
  body: Record<string, unknown>,
): Promise<T> {
  const supabase = createClient();
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    throw new Error("Sign in required. Use Continue as guest or your email.");
  }
  await supabase.auth.refreshSession().catch(() => {
    /* best-effort */
  });

  let res: Response;
  try {
    res = await fetch(`/api/functions/${name}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(
      "Could not reach the analysis service. Check your connection and try again.",
    );
  }

  const payload = (await res.json().catch(() => null)) as
    | T
    | { error?: string; message?: string }
    | null;

  if (!res.ok) {
    const err =
      (payload && typeof payload === "object" && "error" in payload
        ? payload.error
        : null) ??
      (payload && typeof payload === "object" && "message" in payload
        ? payload.message
        : null) ??
      res.statusText;
    if (res.status === 401) {
      throw new Error("Session expired. Sign in again (guest or email).");
    }
    throw new Error(err || "Request failed");
  }

  return payload as T;
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
  /** Dev/QA: force full 10-category weights on the server. */
  scoringMode?: "registered";
}

export async function analyze(
  args: AnalyzeArgs,
): Promise<{ analysisId: string | null; result: AnalysisResult }> {
  const data = await invoke<{ analysisId: string | null; result: unknown }>(
    "analyze",
    { ...args } as unknown as Record<string, unknown>,
  );
  return {
    analysisId: data.analysisId,
    result: normalizeAnalysisResult(data.result),
  };
}
