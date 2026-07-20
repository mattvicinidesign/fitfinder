import { patchPdfContentStreamBytes } from "./patch_pdf_content_stream.ts";
import type { PdfTextRun } from "./pdf_extract_runs.ts";
import type { AtsKeywordChange } from "./patch_resume_docx.ts";

export type PdfPatchResult = {
  bytes: Uint8Array;
  appliedSubstitutions: AtsKeywordChange[];
  rejectedSubstitutions: AtsKeywordChange[];
};

/** Replace keyword swaps in-place inside PDF content streams — never redraw lines. */
export async function patchPdfBytes(
  bytes: Uint8Array,
  substitutions: AtsKeywordChange[],
  runs: PdfTextRun[],
  _optimizedText?: string,
): Promise<PdfPatchResult> {
  const patched = patchPdfContentStreamBytes(bytes, substitutions, runs);

  return {
    bytes: patched.bytes,
    appliedSubstitutions: patched.appliedSubstitutions,
    rejectedSubstitutions: patched.rejectedSubstitutions,
  };
}
