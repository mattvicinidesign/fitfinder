/** Show rejected ATS candidates in the review UI (dev or explicit flag). */
export function isAtsOptimizerDebugEnabled(): boolean {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.NEXT_PUBLIC_ATS_OPTIMIZER_DEBUG === "true"
  );
}

export type AtsReplacementAuditEntry = {
  stage: "text_apply" | "pdf_export" | "snippet_render";
  replacement: string;
  originalSentence: string;
  resultingSentence: string;
  finalRenderedSentence?: string;
  integrityPassed: boolean;
  failures: string[];
  loggedAt: string;
};

const AUDIT_STORAGE_KEY = "fitfinder-ats-replacement-audit";
const AUDIT_LIMIT = 100;

export function clearReplacementAudit(): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(AUDIT_STORAGE_KEY);
}

export function readReplacementAudit(): AtsReplacementAuditEntry[] {
  if (typeof sessionStorage === "undefined") return [];
  const raw = sessionStorage.getItem(AUDIT_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as AtsReplacementAuditEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function logReplacementAudit(
  entry: Omit<AtsReplacementAuditEntry, "loggedAt">,
): void {
  if (!isAtsOptimizerDebugEnabled()) return;

  const next: AtsReplacementAuditEntry = {
    ...entry,
    loggedAt: new Date().toISOString(),
  };

  if (typeof sessionStorage !== "undefined") {
    const current = readReplacementAudit();
    sessionStorage.setItem(
      AUDIT_STORAGE_KEY,
      JSON.stringify([next, ...current].slice(0, AUDIT_LIMIT)),
    );
  }

  console.info("[ATS replacement audit]", next);
}
