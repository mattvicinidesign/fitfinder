"use client";

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

function triggerBrowserDownload(blob: Blob, downloadName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = downloadName;
  anchor.click();
  URL.revokeObjectURL(url);
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

  triggerBrowserDownload(blob, downloadName);
}
