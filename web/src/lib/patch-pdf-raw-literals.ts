"use client";

import type { AtsKeywordChange } from "@/lib/types";

function escapePdfLiteral(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

export type RawPdfPatchResult = {
  blob: Blob;
  appliedSubstitutions: AtsKeywordChange[];
};

/**
 * Patch PDF content-stream string literals when pdf.js run extraction or
 * line redraw is unavailable (common on Capacitor).
 */
export async function patchPdfBlobRawLiterals(
  blob: Blob,
  substitutions: AtsKeywordChange[],
): Promise<RawPdfPatchResult | null> {
  if (substitutions.length === 0) return null;

  const bytes = new Uint8Array(await blob.arrayBuffer());
  let content = new TextDecoder("latin1").decode(bytes);
  const applied: AtsKeywordChange[] = [];

  for (const substitution of substitutions) {
    const candidates: Array<{ needle: string; replacement: string }> = [
      {
        needle: `(${escapePdfLiteral(substitution.before)})`,
        replacement: `(${escapePdfLiteral(substitution.after)})`,
      },
      {
        needle: `(${substitution.before})`,
        replacement: `(${substitution.after})`,
      },
    ];

    let matched = false;
    for (const { needle, replacement } of candidates) {
      if (!content.includes(needle)) continue;
      content = content.split(needle).join(replacement);
      matched = true;
      break;
    }

    if (matched) {
      applied.push(substitution);
    }
  }

  if (applied.length === 0) return null;

  return {
    blob: new Blob([new TextEncoder().encode(content)], {
      type: "application/pdf",
    }),
    appliedSubstitutions: applied,
  };
}
