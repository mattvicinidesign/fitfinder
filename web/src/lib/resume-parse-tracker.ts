import type { ParsedResume } from "@/lib/types";

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
