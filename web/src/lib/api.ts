"use client";

/**
 * Shared API layer — all product clients call the Supabase Edge Functions here.
 * Scoring, parsing, and narrative generation live only on the backend
 * (`supabase/functions/_shared/`). Never duplicate that logic in UI code.
 */

import { createClient } from "@/lib/supabase/client";
import { normalizeAnalysisResult } from "@/lib/normalize-score";
import { isNativePlatform } from "@/lib/platform";
import type { AnalysisResult, ParsedJob, ParsedResume } from "@/lib/types";

const ANALYZE_TIMEOUT_MS = 120_000;
const DEFAULT_TIMEOUT_MS = 90_000;

function functionsUrl(name: string): string {
  if (isNativePlatform()) {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!base) {
      throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL.");
    }
    return `${base}/functions/v1/${name}`;
  }
  return `/api/functions/${name}`;
}

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

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const accessToken = session?.access_token;
  if (!accessToken) {
    throw new Error("Session expired. Sign in again (guest or email).");
  }

  const timeoutMs = name === "analyze" ? ANALYZE_TIMEOUT_MS : DEFAULT_TIMEOUT_MS;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (isNativePlatform()) {
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!anonKey) {
      throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY.");
    }
    headers.Authorization = `Bearer ${accessToken}`;
    headers.apikey = anonKey;
  }

  let res: Response;
  try {
    res = await fetch(functionsUrl(name), {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (e) {
    if (e instanceof Error && e.name === "TimeoutError") {
      throw new Error(
        name === "analyze"
          ? "Analysis timed out. Shorten the job description and try again."
          : "Request timed out. Try again.",
      );
    }
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
    throw new Error(
      typeof err === "string" && err.trim() ? err : "Request failed",
    );
  }

  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid response from the analysis service.");
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
