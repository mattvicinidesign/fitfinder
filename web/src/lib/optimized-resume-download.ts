"use client";

import { isNativePlatform } from "@/lib/platform";
import { fetchResumeFileFromStorage } from "@/lib/fetch-resume-file";
import { patchDocxBlob } from "@/lib/patch-resume-docx";
import { patchPdfBlob } from "@/lib/patch-resume-pdf";
import { extractPdfRunsFromFile } from "@/lib/extract-resume-pdf-runs";
import {
  getCachedResumeFile,
  getCachedResumeFileMeta,
  getCachedResumePdfRuns,
} from "@/lib/resume-file-cache";
import type { AtsKeywordChange, AtsKeywordOptimization } from "@/lib/types";
import {
  ATS_PREVIEW_KEYWORD_CHANGE_COUNT,
  passesVisualWidthTolerance,
} from "@/lib/ats-keyword-optimization-core";

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

async function shareNativeDownload(blob: Blob, downloadName: string): Promise<void> {
  const [{ Filesystem, Directory }, { Share }] = await Promise.all([
    import("@capacitor/filesystem"),
    import("@capacitor/share"),
  ]);

  const base64 = await blobToBase64(blob);
  const saved = await Filesystem.writeFile({
    path: downloadName,
    data: base64,
    directory: Directory.Cache,
  });

  await Share.share({
    title: downloadName,
    url: saved.uri,
    dialogTitle: "Save optimized resume",
  });
}

async function resolveOriginalFile(
  resumeId: string | null | undefined,
  sourceFileName: string,
): Promise<{ blob: Blob; fileName: string } | null> {
  if (resumeId) {
    const cached = await getCachedResumeFile(resumeId);
    const meta = await getCachedResumeFileMeta(resumeId);
    if (cached) {
      return {
        blob: cached,
        fileName: meta?.fileName ?? sourceFileName,
      };
    }

    const remote = await fetchResumeFileFromStorage(resumeId);
    if (remote) return remote;
  }

  return null;
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
}> {
  const format = getOptimizedResumeOutputFormat(input.sourceFileName);
  const downloadName = buildOptimizedResumeDownloadName(
    input.sourceFileName,
    format,
  );

  const original = await resolveOriginalFile(input.resumeId, input.sourceFileName);

  if (!original) {
    return {
      blob: new Blob([input.patchedText], { type: "text/plain;charset=utf-8" }),
      downloadName,
      layoutPreserved: false,
      typographyPreserved: false,
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
    };
  }

  if (format === "pdf") {
    let runs =
      (input.resumeId ? await getCachedResumePdfRuns(input.resumeId) : null) ??
      [];
    if (runs.length === 0) {
      try {
        const extracted = await extractPdfRunsFromFile(
          new File([original.blob], original.fileName, {
            type: original.blob.type || "application/pdf",
          }),
        );
        runs = extracted.runs;
      } catch {
        runs = [];
      }
    }

    if (input.substitutions.length === 0) {
      return {
        blob: original.blob,
        downloadName: original.fileName,
        layoutPreserved: true,
        typographyPreserved: true,
      };
    }

    if (runs.length === 0) {
      return {
        blob: new Blob([input.patchedText], { type: "text/plain;charset=utf-8" }),
        downloadName: buildOptimizedResumeDownloadName(
          input.sourceFileName,
          "txt",
        ),
        layoutPreserved: false,
        typographyPreserved: false,
      };
    }

    const patched = await patchPdfBlob(original.blob, input.substitutions, runs);
    return {
      blob: patched.blob,
      downloadName,
      layoutPreserved: true,
      typographyPreserved:
        patched.rejectedSubstitutions.length === 0 &&
        patched.appliedSubstitutions.length === input.substitutions.length,
    };
  }

  return {
    blob: new Blob([input.patchedText], { type: "text/plain;charset=utf-8" }),
    downloadName,
    layoutPreserved: true,
    typographyPreserved: true,
  };
}

export type DownloadOptimizedResumeInput = {
  patchedText: string;
  originalText: string;
  sourceFileName?: string;
  resumeId?: string | null;
  substitutions: AtsKeywordChange[];
  layoutReverted?: boolean;
};

export function buildOptimizedResumeDownloadInput(
  optimization: AtsKeywordOptimization,
  sourceFileName: string,
  resumeId?: string | null,
): DownloadOptimizedResumeInput {
  const preview = optimization.keywordChanges.slice(
    0,
    ATS_PREVIEW_KEYWORD_CHANGE_COUNT,
  );
  const decisions = optimization.keywordChangeDecisions ?? [];
  const approvedFromDecisions = preview.filter(
    (_, index) => decisions[index] === "approved",
  );
  const substitutions =
    optimization.appliedKeywordChanges ??
    (optimization.layoutReverted ? [] : approvedFromDecisions);

  return {
    patchedText: optimization.optimizedResumeText,
    originalText: optimization.originalResumeText,
    sourceFileName,
    resumeId,
    substitutions,
    layoutReverted: optimization.layoutReverted === true,
  };
}

/** Export optimized resume by patching the canonical file — never rebuilding layout. */
export async function downloadOptimizedResume(
  input: DownloadOptimizedResumeInput | string,
  legacySourceFileName = "resume.pdf",
): Promise<{ layoutPreserved: boolean; typographyPreserved: boolean }> {
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

  const { blob, downloadName, layoutPreserved, typographyPreserved } =
    await createLayoutPreservingBlob({
      patchedText: exportText,
      sourceFileName,
      resumeId: resolved.resumeId,
      substitutions: resolved.layoutReverted ? [] : resolved.substitutions,
    });

  if (isNativePlatform()) {
    await shareNativeDownload(blob, downloadName);
    return { layoutPreserved, typographyPreserved };
  }

  triggerBrowserDownload(blob, downloadName);
  return { layoutPreserved, typographyPreserved };
}
