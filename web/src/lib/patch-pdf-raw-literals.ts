"use client";

import { patchPdfContentStreamBytes } from "@/lib/patch-pdf-content-stream";
import type { AtsKeywordChange } from "@/lib/types";

export type RawPdfPatchResult = {
  blob: Blob;
  appliedSubstitutions: AtsKeywordChange[];
};

/**
 * Patch PDF content-stream string literals when pdf.js run extraction is
 * unavailable (common on Capacitor).
 */
export async function patchPdfBlobRawLiterals(
  blob: Blob,
  substitutions: AtsKeywordChange[],
): Promise<RawPdfPatchResult | null> {
  if (substitutions.length === 0) return null;

  const patched = patchPdfContentStreamBytes(
    new Uint8Array(await blob.arrayBuffer()),
    substitutions,
  );

  if (patched.appliedSubstitutions.length === 0) return null;

  return {
    blob: new Blob([patched.bytes as BlobPart], { type: "application/pdf" }),
    appliedSubstitutions: patched.appliedSubstitutions,
  };
}
