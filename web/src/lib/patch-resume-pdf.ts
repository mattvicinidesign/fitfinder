import { logReplacementAudit } from "@/lib/ats-optimizer-debug";
import type { PdfTextRun } from "@/lib/extract-resume-pdf-runs";
import { patchPdfContentStreamBytes } from "@/lib/patch-pdf-content-stream";
import type { AtsKeywordChange } from "@/lib/types";

export type PdfPatchResult = {
  blob: Blob;
  appliedSubstitutions: AtsKeywordChange[];
  rejectedSubstitutions: AtsKeywordChange[];
};

/** Replace keyword swaps in-place inside PDF content streams — never redraw lines. */
export async function patchPdfBlob(
  blob: Blob,
  substitutions: AtsKeywordChange[],
  runs: PdfTextRun[],
  _optimizedText?: string,
): Promise<PdfPatchResult> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const patched = patchPdfContentStreamBytes(bytes, substitutions, runs);

  for (const substitution of patched.appliedSubstitutions) {
    logReplacementAudit({
      stage: "pdf_export",
      replacement: `${substitution.before} → ${substitution.after}`,
      originalSentence: substitution.originalBulletText ?? substitution.before,
      resultingSentence: substitution.optimizedBulletText ?? substitution.after,
      finalRenderedSentence: substitution.optimizedBulletText ?? substitution.after,
      integrityPassed: true,
      failures: [],
    });
  }

  for (const substitution of patched.rejectedSubstitutions) {
    logReplacementAudit({
      stage: "pdf_export",
      replacement: `${substitution.before} → ${substitution.after}`,
      originalSentence: substitution.originalBulletText ?? substitution.before,
      resultingSentence: substitution.originalBulletText ?? substitution.before,
      finalRenderedSentence: substitution.originalBulletText ?? substitution.before,
      integrityPassed: false,
      failures: ["PDF literal patch not found in content stream"],
    });
  }

  return {
    blob: new Blob([patched.bytes as BlobPart], { type: "application/pdf" }),
    appliedSubstitutions: patched.appliedSubstitutions,
    rejectedSubstitutions: patched.rejectedSubstitutions,
  };
}
