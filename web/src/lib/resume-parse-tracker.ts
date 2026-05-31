const inflight = new Map<string, Promise<void>>();
const errors = new Map<string, Error>();

/** Track a background resume parse so callers can await it before analyze. */
export function trackResumeParse(
  resumeId: string,
  parsePromise: Promise<unknown>,
): void {
  errors.delete(resumeId);
  const tracked = parsePromise
    .then(() => {
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

export function isResumeParsePending(resumeId: string): boolean {
  return inflight.has(resumeId);
}
