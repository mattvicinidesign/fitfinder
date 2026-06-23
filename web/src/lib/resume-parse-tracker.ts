import type { ParsedResume } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";

const inflight = new Map<string, Promise<void>>();
const errors = new Map<string, Error>();
const parsedCache = new Map<string, ParsedResume>();

const textCache = new Map<string, string>();

const TEXT_CACHE_PREFIX = "fitfinder:resume-text:";

/** Cache extracted resume plain text for ATS keyword scans and review flows. */
export function cacheResumeText(resumeId: string, text: string): void {
  const trimmed = text.trim();
  if (!trimmed) return;
  textCache.set(resumeId, trimmed);
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.setItem(`${TEXT_CACHE_PREFIX}${resumeId}`, trimmed);
  }
  void import("@/lib/resume-file-cache").then(({ cacheResumePlainText }) =>
    cacheResumePlainText(resumeId, trimmed),
  );
}

export function getCachedResumeText(resumeId: string): string | null {
  const memory = textCache.get(resumeId);
  if (memory) return memory;
  if (typeof sessionStorage === "undefined") return null;
  const stored = sessionStorage.getItem(`${TEXT_CACHE_PREFIX}${resumeId}`);
  if (stored) {
    textCache.set(resumeId, stored);
    return stored;
  }
  return null;
}

/** Resolve the Storage resume row id for ATS flows (cached review may omit resumeId). */
export async function resolveResumeIdForOptimization(
  explicitId?: string | null,
): Promise<string | null> {
  const trimmed = explicitId?.trim();
  if (trimmed) return trimmed;

  const { loadResumeReview, loadResumeReviewResumeId } = await import(
    "@/lib/resume-review-cache"
  );
  const stored = loadResumeReviewResumeId();
  if (stored) return stored;

  const review = loadResumeReview();
  if (review?.resumeId) return review.resumeId;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("resumes")
    .select("id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.id ?? null;
}

/** Rehydrate plain text when session cache was cleared (native QA refresh / cold start). */
export async function resolveResumeTextForOptimization(
  resumeId: string,
): Promise<string | null> {
  const cached = getCachedResumeText(resumeId);
  if (cached) return cached;

  const {
    getCachedResumePlainText,
    getCachedResumePdfRuns,
    getCachedResumeFile,
  } = await import("@/lib/resume-file-cache");

  const persisted = await getCachedResumePlainText(resumeId);
  if (persisted) {
    cacheResumeText(resumeId, persisted);
    return persisted;
  }

  const runs = await getCachedResumePdfRuns(resumeId);
  if (runs?.length) {
    const { plainTextFromPdfRuns } = await import("@/lib/extract-resume-pdf-runs");
    const text = plainTextFromPdfRuns(runs);
    if (text) {
      cacheResumeText(resumeId, text);
      return text;
    }
  }

  const localFile = await getCachedResumeFile(resumeId);
  if (localFile) {
    try {
      const { extractResumeTextFromFile } = await import("@/lib/extract-resume-text");
      const text = (await extractResumeTextFromFile(localFile)).trim();
      if (text) {
        cacheResumeText(resumeId, text);
        return text;
      }
    } catch {
      // Fall through to Storage fetch.
    }
  }

  try {
    const { fetchResumeFileFromStorage } = await import("@/lib/fetch-resume-file");
    const remote = await fetchResumeFileFromStorage(resumeId);
    if (remote) {
      const { extractResumeTextFromFile } = await import("@/lib/extract-resume-text");
      const text = (
        await extractResumeTextFromFile(
          new File([remote.blob], remote.fileName, {
            type: remote.blob.type || "application/octet-stream",
          }),
        )
      ).trim();
      if (text) {
        cacheResumeText(resumeId, text);
        return text;
      }
    }
  } catch {
    // Fall through to server extraction.
  }

  try {
    const { fetchResumeTextFromServer } = await import("@/lib/api");
    const serverText = await fetchResumeTextFromServer(resumeId);
    if (serverText) {
      cacheResumeText(resumeId, serverText);
      return serverText;
    }
  } catch (error) {
    throw error instanceof Error
      ? error
      : new Error("Could not load resume text from the server.");
  }

  return null;
}

/** Track a background resume parse so callers can await it before analyze. */
export function trackResumeParse(
  resumeId: string,
  parsePromise: Promise<{ parsedResume: ParsedResume }>,
): void {
  errors.delete(resumeId);
  const tracked = parsePromise
    .then((result) => {
      parsedCache.set(resumeId, result.parsedResume);
      errors.delete(resumeId);
    })
    .catch((err: unknown) => {
      const error =
        err instanceof Error ? err : new Error("Resume parsing failed.");
      errors.set(resumeId, error);
    })
    .finally(() => {
      if (inflight.get(resumeId) === tracked) {
        inflight.delete(resumeId);
      }
    });
  inflight.set(resumeId, tracked);
}

/** Wait for an in-flight resume parse started by uploadResume. */
export async function waitForResumeParse(resumeId: string): Promise<void> {
  const pending = inflight.get(resumeId);
  if (pending) await pending;
  const error = errors.get(resumeId);
  if (error) throw error;
}

export function getCachedParsedResume(resumeId: string): ParsedResume | null {
  return parsedCache.get(resumeId) ?? null;
}

export function isResumeParsePending(resumeId: string): boolean {
  return inflight.has(resumeId);
}
