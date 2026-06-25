"use client";

import { isNativePlatform } from "@/lib/platform";
import { fetchResumeFileFromStorage } from "@/lib/fetch-resume-file";
import { patchDocxBlob } from "@/lib/patch-resume-docx";
import { patchPdfBlob } from "@/lib/patch-resume-pdf";
import { patchPdfBlobRawLiterals } from "@/lib/patch-pdf-raw-literals";
import { extractPdfRunsFromFile, type PdfTextRun } from "@/lib/extract-resume-pdf-runs";
import { resolveResumeIdForOptimization } from "@/lib/resume-parse-tracker";
import {
  cacheResumePdfRuns,
  getCachedResumeFile,
  getCachedResumeFileMeta,
  getCachedResumePdfRuns,
} from "@/lib/resume-file-cache";
import type { AtsKeywordChange, AtsKeywordOptimization } from "@/lib/types";
import {
  ATS_PREVIEW_KEYWORD_CHANGE_COUNT,
  passesVisualWidthTolerance,
} from "@/lib/ats-keyword-optimization-core";
import {
  buildOptimizedResumeDownloadName,
  getOptimizedResumeOutputFormat,
  resolveOptimizedSubstitutions,
} from "@/lib/optimized-resume-format";

export type OptimizedResumeExportResult = {
  layoutPreserved: boolean;
  typographyPreserved: boolean;
  appliedSubstitutionCount: number;
  requestedSubstitutionCount: number;
};

export type DownloadOptimizedResumeInput = {
  patchedText: string;
  originalText: string;
  sourceFileName?: string;
  resumeId?: string | null;
  substitutions: AtsKeywordChange[];
  layoutReverted?: boolean;
};

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

type ServerExportPayload = {
  base64: string;
  downloadName: string;
  mimeType: string;
  layoutPreserved: boolean;
  typographyPreserved: boolean;
  appliedSubstitutionCount?: number;
  requestedSubstitutionCount?: number;
};

async function exportOptimizedResumeViaServer(
  input: DownloadOptimizedResumeInput,
  resumeId: string,
): Promise<ServerExportPayload> {
  const { invokeFunction } = await import("@/lib/invoke-function");
  return invokeFunction<ServerExportPayload>(
    "export-optimized-resume",
    {
      resumeId,
      substitutions: input.substitutions,
      patchedText: input.patchedText,
      sourceFileName: input.sourceFileName ?? "resume.pdf",
    },
    120_000,
  );
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Could not read file data."));
        return;
      }
      const base64 = result.split(",")[1];
      if (!base64) {
        reject(new Error("Could not encode file data."));
        return;
      }
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Could not read file."));
    reader.readAsDataURL(blob);
  });
}

function triggerBrowserDownload(blob: Blob, downloadName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = downloadName;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function shareNativeBase64File(
  base64: string,
  downloadName: string,
): Promise<void> {
  const [{ Filesystem, Directory }, { Share }] = await Promise.all([
    import("@capacitor/filesystem"),
    import("@capacitor/share"),
  ]);

  const safeName = downloadName.replace(/[^\w.-]+/g, "_");
  const path = `optimized-resumes/${Date.now()}-${safeName}`;
  const saved = await Filesystem.writeFile({
    path,
    data: base64,
    directory: Directory.Documents,
    recursive: true,
  });

  await Share.share({
    title: downloadName,
    files: [saved.uri],
    dialogTitle: "Save optimized resume",
  });
}

async function shareNativeBlob(blob: Blob, downloadName: string): Promise<void> {
  await shareNativeBase64File(await blobToBase64(blob), downloadName);
}

function plainTextBlob(text: string): Blob {
  return new Blob([text], { type: "text/plain;charset=utf-8" });
}

function pdfBlob(bytes: Blob | ArrayBuffer | Uint8Array): Blob {
  const data =
    bytes instanceof Blob ? bytes : new Blob([bytes as BlobPart]);
  if (data.type === "application/pdf") return data;
  return new Blob([data], { type: "application/pdf" });
}

async function patchPdfForExport(input: {
  blob: Blob;
  substitutions: AtsKeywordChange[];
  runs: PdfTextRun[];
  patchedText: string;
}): Promise<{
  blob: Blob;
  layoutPreserved: boolean;
  typographyPreserved: boolean;
  appliedSubstitutionCount: number;
}> {
  if (input.substitutions.length === 0) {
    return {
      blob: pdfBlob(input.blob),
      layoutPreserved: false,
      typographyPreserved: false,
      appliedSubstitutionCount: 0,
    };
  }

  if (input.runs.length > 0) {
    try {
      const patched = await patchPdfBlob(
        input.blob,
        input.substitutions,
        input.runs,
        input.patchedText,
      );
      if (patched.appliedSubstitutions.length > 0) {
        return {
          blob: pdfBlob(patched.blob),
          layoutPreserved: true,
          typographyPreserved:
            patched.rejectedSubstitutions.length === 0 &&
            patched.appliedSubstitutions.length === input.substitutions.length,
          appliedSubstitutionCount: patched.appliedSubstitutions.length,
        };
      }
    } catch {
      // Fall through to raw literal patching.
    }
  }

  const raw = await patchPdfBlobRawLiterals(input.blob, input.substitutions);
  if (raw) {
    return {
      blob: pdfBlob(raw.blob),
      layoutPreserved: true,
      typographyPreserved:
        raw.appliedSubstitutions.length === input.substitutions.length,
      appliedSubstitutionCount: raw.appliedSubstitutions.length,
    };
  }

  return {
    blob: pdfBlob(input.blob),
    layoutPreserved: false,
    typographyPreserved: false,
    appliedSubstitutionCount: 0,
  };
}

async function resolvePdfRunsForExport(
  resumeId: string | null | undefined,
  file: File,
): Promise<PdfTextRun[]> {
  if (resumeId) {
    const cached = await getCachedResumePdfRuns(resumeId);
    if (cached?.length) return cached;
  }

  const { ensurePdfJsWorkerReady } = await import("@/lib/pdfjs-worker");
  ensurePdfJsWorkerReady();

  const extracted = await extractPdfRunsFromFile(file);
  if (resumeId && extracted.runs.length > 0) {
    await cacheResumePdfRuns(resumeId, extracted.runs);
  }
  return extracted.runs;
}

async function resolveOriginalFile(
  resumeId: string | null | undefined,
  sourceFileName: string,
): Promise<{ blob: Blob; fileName: string } | null> {
  const resolvedId = resumeId ?? (await resolveResumeIdForOptimization());
  if (!resolvedId) return null;

  const cached = await getCachedResumeFile(resolvedId);
  const meta = await getCachedResumeFileMeta(resolvedId);
  if (cached) {
    return {
      blob: cached,
      fileName: meta?.fileName ?? sourceFileName,
    };
  }

  const remote = await fetchResumeFileFromStorage(resolvedId);
  if (!remote) return null;

  const remoteFile = new File([remote.blob], remote.fileName, {
    type: remote.blob.type || "application/octet-stream",
  });

  try {
    const { cacheResumeFile } = await import("@/lib/resume-file-cache");
    let pageCount = 1;
    if (remote.fileName.toLowerCase().endsWith(".pdf")) {
      try {
        const { ensurePdfJsWorkerReady } = await import("@/lib/pdfjs-worker");
        ensurePdfJsWorkerReady();
        const extracted = await extractPdfRunsFromFile(remoteFile);
        pageCount = extracted.pageCount;
        if (extracted.runs.length > 0) {
          await cacheResumePdfRuns(resolvedId, extracted.runs);
        }
      } catch {
        // Best-effort.
      }
    }
    await cacheResumeFile(resolvedId, remoteFile, {
      fileName: remote.fileName,
      pageCount,
    });
  } catch {
    // Best-effort.
  }

  return remote;
}

async function createLayoutPreservingBlob(input: {
  patchedText: string;
  sourceFileName: string;
  resumeId?: string | null;
  substitutions: AtsKeywordChange[];
}): Promise<{
  blob: Blob;
  downloadName: string;
  layoutPreserved: boolean;
  typographyPreserved: boolean;
  appliedSubstitutionCount: number;
  requestedSubstitutionCount: number;
}> {
  const format = getOptimizedResumeOutputFormat(input.sourceFileName);
  const downloadName = buildOptimizedResumeDownloadName(
    input.sourceFileName,
    format,
  );
  const requestedSubstitutionCount = input.substitutions.length;

  const resumeId =
    input.resumeId ?? (await resolveResumeIdForOptimization());
  const original = await resolveOriginalFile(resumeId, input.sourceFileName);

  if (!original) {
    return {
      blob: plainTextBlob(input.patchedText),
      downloadName:
        format === "txt"
          ? downloadName
          : buildOptimizedResumeDownloadName(input.sourceFileName, "txt"),
      layoutPreserved: false,
      typographyPreserved: false,
      appliedSubstitutionCount: requestedSubstitutionCount,
      requestedSubstitutionCount,
    };
  }

  if (format === "docx") {
    const widthSafe = input.substitutions.filter((substitution) =>
      passesVisualWidthTolerance(substitution),
    );
    const blob = await patchDocxBlob(original.blob, widthSafe);
    return {
      blob,
      downloadName,
      layoutPreserved: true,
      typographyPreserved: widthSafe.length === input.substitutions.length,
      appliedSubstitutionCount: widthSafe.length,
      requestedSubstitutionCount,
    };
  }

  if (format === "pdf") {
    const sourceFile = new File([original.blob], original.fileName, {
      type: original.blob.type || "application/pdf",
    });

    let runs: PdfTextRun[] = [];
    try {
      runs = await resolvePdfRunsForExport(resumeId, sourceFile);
    } catch {
      runs = [];
    }

    const patched = await patchPdfForExport({
      blob: original.blob,
      substitutions: input.substitutions,
      runs,
      patchedText: input.patchedText,
    });
    return {
      blob: patched.blob,
      downloadName,
      layoutPreserved: patched.layoutPreserved,
      typographyPreserved: patched.typographyPreserved,
      appliedSubstitutionCount: patched.appliedSubstitutionCount,
      requestedSubstitutionCount,
    };
  }

  return {
    blob: plainTextBlob(input.patchedText),
    downloadName,
    layoutPreserved: true,
    typographyPreserved: true,
    appliedSubstitutionCount: requestedSubstitutionCount,
    requestedSubstitutionCount,
  };
}

export function buildOptimizedResumeDownloadInput(
  optimization: AtsKeywordOptimization,
  sourceFileName: string,
  resumeId?: string | null,
): DownloadOptimizedResumeInput {
  const substitutions = resolveOptimizedSubstitutions({
    appliedKeywordChanges: optimization.appliedKeywordChanges,
    keywordChanges: optimization.keywordChanges,
    keywordChangeDecisions: optimization.keywordChangeDecisions,
    layoutReverted: optimization.layoutReverted,
    previewCount: ATS_PREVIEW_KEYWORD_CHANGE_COUNT,
  });

  return {
    patchedText: optimization.optimizedResumeText,
    originalText: optimization.originalResumeText,
    sourceFileName,
    resumeId,
    substitutions,
    layoutReverted: optimization.layoutReverted === true,
  };
}

function assertExportAppliedChanges(result: OptimizedResumeExportResult): void {
  if (
    result.requestedSubstitutionCount > 0 &&
    result.appliedSubstitutionCount === 0
  ) {
    throw new Error(
      "Keyword changes could not be written into the exported file.",
    );
  }
}

/** Export optimized resume by patching the canonical file — never rebuilding layout. */
export async function downloadOptimizedResume(
  input: DownloadOptimizedResumeInput | string,
  legacySourceFileName = "resume.pdf",
): Promise<OptimizedResumeExportResult> {
  const resolved: DownloadOptimizedResumeInput =
    typeof input === "string"
      ? {
          patchedText: input,
          originalText: input,
          sourceFileName: legacySourceFileName,
          substitutions: [],
        }
      : input;

  const sourceFileName = resolved.sourceFileName ?? legacySourceFileName;
  const exportText = resolved.layoutReverted
    ? resolved.originalText
    : resolved.patchedText;
  const resumeId = await resolveResumeIdForOptimization(resolved.resumeId);
  const substitutions = resolved.layoutReverted ? [] : resolved.substitutions;
  const requestedSubstitutionCount = substitutions.length;

  if (isNativePlatform()) {
    if (!resumeId) {
      throw new Error("Resume file reference missing. Re-upload your resume.");
    }

    const payload = await exportOptimizedResumeViaServer(
      {
        patchedText: exportText,
        originalText: resolved.originalText,
        sourceFileName,
        resumeId,
        substitutions,
        layoutReverted: resolved.layoutReverted,
      },
      resumeId,
    );

    const result: OptimizedResumeExportResult = {
      layoutPreserved: payload.layoutPreserved === true,
      typographyPreserved: payload.typographyPreserved === true,
      appliedSubstitutionCount:
        payload.appliedSubstitutionCount ?? requestedSubstitutionCount,
      requestedSubstitutionCount:
        payload.requestedSubstitutionCount ?? requestedSubstitutionCount,
    };
    assertExportAppliedChanges(result);

    await shareNativeBase64File(payload.base64, payload.downloadName);
    return result;
  }

  const {
    blob,
    downloadName,
    layoutPreserved,
    typographyPreserved,
    appliedSubstitutionCount,
  } = await createLayoutPreservingBlob({
    patchedText: exportText,
    sourceFileName,
    resumeId,
    substitutions,
  });

  const result: OptimizedResumeExportResult = {
    layoutPreserved,
    typographyPreserved,
    appliedSubstitutionCount,
    requestedSubstitutionCount,
  };
  assertExportAppliedChanges(result);
  triggerBrowserDownload(blob, downloadName);
  return result;
}
