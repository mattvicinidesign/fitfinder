import { passesVisualWidthTolerance } from "./ats_keyword_optimization.ts";
import {
  patchDocxBytes,
  type AtsKeywordChange,
} from "./patch_resume_docx.ts";

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

async function buildTextPdfBytes(text: string): Promise<Uint8Array> {
  const { jsPDF } = await import("npm:jspdf@4.2.1");
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const margin = 56;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);

  for (const line of text.replace(/\r\n/g, "\n").split("\n")) {
    if (!line.trim()) {
      y += 8;
      continue;
    }
    const wrapped = doc.splitTextToSize(line, contentWidth) as string[];
    for (const entry of wrapped) {
      ensureSpace(14);
      doc.text(entry, margin, y);
      y += 14;
    }
  }

  return new Uint8Array(doc.output("arraybuffer"));
}

export async function exportOptimizedResumeBytes(input: {
  fileBytes: Uint8Array;
  fileName: string;
  substitutions: AtsKeywordChange[];
  patchedText: string;
}): Promise<ServerExportResult> {
  const format = getOptimizedResumeOutputFormat(input.fileName);
  const downloadName = buildOptimizedResumeDownloadName(input.fileName, format);
  const requestedSubstitutionCount = input.substitutions.length;

  if (format === "docx") {
    const widthSafe = input.substitutions.filter((substitution) =>
      passesVisualWidthTolerance(substitution)
    );
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
    if (input.substitutions.length === 0) {
      return {
        bytes: input.fileBytes,
        downloadName,
        mimeType: "application/pdf",
        layoutPreserved: false,
        typographyPreserved: false,
        appliedSubstitutionCount: 0,
        requestedSubstitutionCount: 0,
      };
    }

    const bytes = await buildTextPdfBytes(input.patchedText);
    return {
      bytes,
      downloadName: buildOptimizedResumeDownloadName(input.fileName, "pdf"),
      mimeType: "application/pdf",
      layoutPreserved: false,
      typographyPreserved: false,
      appliedSubstitutionCount: requestedSubstitutionCount,
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
