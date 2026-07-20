import { passesVisualWidthTolerance } from "./ats_keyword_optimization.ts";
import {
  patchDocxBytes,
  type AtsKeywordChange,
} from "./patch_resume_docx.ts";
import { extractPdfRunsFromBuffer } from "./pdf_extract_runs.ts";
import { patchPdfBytes } from "./patch_resume_pdf.ts";

export type OptimizedResumeOutputFormat = "pdf" | "docx" | "txt";

export function getOptimizedResumeOutputFormat(
  fileName: string,
): OptimizedResumeOutputFormat {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".pdf")) return "pdf";
  if (lower.endsWith(".docx") || lower.endsWith(".doc")) return "docx";
  return "txt";
}

export function buildOptimizedResumeDownloadName(
  fileName: string,
  format: OptimizedResumeOutputFormat,
): string {
  const base =
    fileName
      .replace(/\.[^.]+$/, "")
      .replace(/-optimized$/i, "")
      .trim() || "resume";
  const ext =
    format === "pdf" ? "pdf" : format === "docx" ? "docx" : "txt";
  return `${base}-optimized.${ext}`;
}

export type ServerExportResult = {
  bytes: Uint8Array;
  downloadName: string;
  mimeType: string;
  layoutPreserved: boolean;
  typographyPreserved: boolean;
  appliedSubstitutionCount: number;
  requestedSubstitutionCount: number;
};

export async function exportOptimizedResumeBytes(input: {
  fileBytes: Uint8Array;
  fileName: string;
  substitutions: AtsKeywordChange[];
  patchedText: string;
}): Promise<ServerExportResult> {
  const format = getOptimizedResumeOutputFormat(input.fileName);
  const downloadName = buildOptimizedResumeDownloadName(input.fileName, format);
  const requestedSubstitutionCount = input.substitutions.length;
  const widthSafe = input.substitutions.filter((substitution) =>
    passesVisualWidthTolerance(substitution)
  );

  if (format === "docx") {
    const bytes = await patchDocxBytes(input.fileBytes, widthSafe);
    return {
      bytes,
      downloadName,
      mimeType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      layoutPreserved: true,
      typographyPreserved: widthSafe.length === input.substitutions.length,
      appliedSubstitutionCount: widthSafe.length,
      requestedSubstitutionCount,
    };
  }

  if (format === "pdf") {
    if (widthSafe.length === 0) {
      return {
        bytes: input.fileBytes,
        downloadName,
        mimeType: "application/pdf",
        layoutPreserved: true,
        typographyPreserved: true,
        appliedSubstitutionCount: 0,
        requestedSubstitutionCount,
      };
    }

    try {
      const { runs } = await extractPdfRunsFromBuffer(input.fileBytes);
      const patched = await patchPdfBytes(
        input.fileBytes,
        widthSafe,
        runs,
        input.patchedText,
      );

      if (patched.appliedSubstitutions.length > 0) {
        return {
          bytes: patched.bytes,
          downloadName,
          mimeType: "application/pdf",
          layoutPreserved: true,
          typographyPreserved:
            patched.rejectedSubstitutions.length === 0 &&
            patched.appliedSubstitutions.length === widthSafe.length,
          appliedSubstitutionCount: patched.appliedSubstitutions.length,
          requestedSubstitutionCount,
        };
      }
    } catch (error) {
      console.error("PDF patch failed; returning original file:", error);
    }

    return {
      bytes: input.fileBytes,
      downloadName,
      mimeType: "application/pdf",
      layoutPreserved: false,
      typographyPreserved: false,
      appliedSubstitutionCount: 0,
      requestedSubstitutionCount,
    };
  }

  return {
    bytes: new TextEncoder().encode(input.patchedText),
    downloadName,
    mimeType: "text/plain;charset=utf-8",
    layoutPreserved: true,
    typographyPreserved: true,
    appliedSubstitutionCount: requestedSubstitutionCount,
    requestedSubstitutionCount,
  };
}

export function bytesToBase64(bytes: Uint8Array): string {
  const chunkSize = 0x8000;
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, offset + chunkSize);
    binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
  }
  return btoa(binary);
}
