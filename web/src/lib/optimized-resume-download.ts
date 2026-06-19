"use client";

import { isNativePlatform } from "@/lib/platform";

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

function writePdfLines(
  doc: import("jspdf").jsPDF,
  text: string,
  margin: number,
  contentWidth: number,
  startY: number,
  lineHeight: number,
): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = startY;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(31, 41, 55);

  for (const line of text.replace(/\r\n/g, "\n").split("\n")) {
    if (!line.trim()) {
      y += lineHeight * 0.45;
      continue;
    }
    const wrapped = doc.splitTextToSize(line, contentWidth) as string[];
    for (const wrappedLine of wrapped) {
      ensureSpace(lineHeight);
      doc.text(wrappedLine, margin, y);
      y += lineHeight;
    }
  }

  return y;
}

async function createOptimizedResumePdfBlob(text: string): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const margin = 56;
  const contentWidth = doc.internal.pageSize.getWidth() - margin * 2;
  writePdfLines(doc, text, margin, contentWidth, margin, 15);
  return doc.output("blob");
}

async function createOptimizedResumeDocxBlob(text: string): Promise<Blob> {
  const { Document, Packer, Paragraph, TextRun } = await import("docx");
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const paragraphs =
    lines.length > 0
      ? lines.map(
          (line) =>
            new Paragraph({
              children: [new TextRun({ text: line || " ", size: 22 })],
            }),
        )
      : [new Paragraph({ children: [new TextRun(" ")] })];

  const document = new Document({
    sections: [{ children: paragraphs }],
  });
  return Packer.toBlob(document);
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

/** Download optimized resume text in the same format family as the uploaded file. */
export async function downloadOptimizedResume(
  text: string,
  sourceFileName = "resume.pdf",
): Promise<void> {
  const format = getOptimizedResumeOutputFormat(sourceFileName);
  const downloadName = buildOptimizedResumeDownloadName(sourceFileName, format);

  let blob: Blob;
  switch (format) {
    case "pdf":
      blob = await createOptimizedResumePdfBlob(text);
      break;
    case "docx":
      blob = await createOptimizedResumeDocxBlob(text);
      break;
    default:
      blob = new Blob([text], { type: "text/plain;charset=utf-8" });
      break;
  }

  if (isNativePlatform()) {
    await shareNativeDownload(blob, downloadName);
    return;
  }

  triggerBrowserDownload(blob, downloadName);
}
