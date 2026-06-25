import type { AtsKeywordChange } from "@/lib/types";

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

export function resolveOptimizedSubstitutions(input: {
  appliedKeywordChanges?: AtsKeywordChange[];
  keywordChanges: AtsKeywordChange[];
  keywordChangeDecisions?: ("approved" | "rejected" | "pending")[];
  layoutReverted?: boolean;
  previewCount: number;
}): AtsKeywordChange[] {
  if (input.appliedKeywordChanges?.length) {
    return input.appliedKeywordChanges;
  }
  if (input.layoutReverted) return [];

  const preview = input.keywordChanges.slice(0, input.previewCount);
  const decisions = input.keywordChangeDecisions ?? [];
  return preview.filter((_, index) => decisions[index] === "approved");
}
