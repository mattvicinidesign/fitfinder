"use client";

export type PdfTextRun = {
  page: number;
  x: number;
  y: number;
  str: string;
  fontSize: number;
  width: number;
  height: number;
  fontName: string;
  avgCharWidth: number;
};

export type PdfExtractionResult = {
  text: string;
  pageCount: number;
  runs: PdfTextRun[];
};

export function normalizePdfTextRun(run: Partial<PdfTextRun> & Pick<PdfTextRun, "page" | "x" | "y" | "str" | "fontSize" | "width">): PdfTextRun {
  const safeLength = Math.max(run.str.length, 1);
  return {
    page: run.page,
    x: run.x,
    y: run.y,
    str: run.str,
    fontSize: run.fontSize,
    width: run.width,
    height: run.height ?? run.fontSize * 1.15,
    fontName: run.fontName ?? "",
    avgCharWidth: run.avgCharWidth ?? run.width / safeLength,
  };
}

export async function extractPdfRunsFromFile(
  file: File,
): Promise<PdfExtractionResult> {
  const pdfjs = await import("pdfjs-dist");
  const { pdfJsWorkerFallbacks } = await import("@/lib/pdfjs-worker");
  const data = new Uint8Array(await file.arrayBuffer());

  let pdf: Awaited<ReturnType<typeof pdfjs.getDocument>["promise"]> | null = null;
  let lastError: Error | null = null;

  for (const workerSrc of pdfJsWorkerFallbacks()) {
    try {
      pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
      pdf = await pdfjs.getDocument({ data }).promise;
      lastError = null;
      break;
    } catch (error) {
      lastError =
        error instanceof Error ? error : new Error("Could not parse PDF.");
    }
  }

  if (!pdf) {
    throw lastError ?? new Error("Could not parse PDF.");
  }

  const allLines: string[] = [];
  const runs: PdfTextRun[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();

    type PdfTextItem = {
      str: string;
      x: number;
      y: number;
      fontSize: number;
      width: number;
      height: number;
      fontName: string;
    };
    const items: PdfTextItem[] = [];

    for (const item of content.items) {
      if (!("str" in item) || !item.str.trim()) continue;
      const transform = item.transform;
      const fontSize = Math.abs(transform[0] ?? 11);
      const width = item.width ?? item.str.length * fontSize * 0.55;
      items.push({
        str: item.str,
        x: transform[4] ?? 0,
        y: transform[5] ?? 0,
        fontSize,
        width,
        height: item.height ?? fontSize * 1.15,
        fontName: "fontName" in item ? String(item.fontName ?? "") : "",
      });
    }

    items.sort((a, b) => {
      const yDiff = b.y - a.y;
      if (Math.abs(yDiff) > 3) return yDiff;
      return a.x - b.x;
    });

    let currentLine: string[] = [];
    let lastY: number | null = null;

    for (const item of items) {
      runs.push({
        page: pageNum,
        x: item.x,
        y: item.y,
        str: item.str,
        fontSize: item.fontSize,
        width: item.width,
        height: item.height,
        fontName: item.fontName,
        avgCharWidth: item.width / Math.max(item.str.length, 1),
      });

      if (lastY !== null && Math.abs(item.y - lastY) > 4) {
        if (currentLine.length > 0) {
          allLines.push(currentLine.join(" ").replace(/\s+/g, " ").trim());
        }
        currentLine = [];
      }
      currentLine.push(item.str);
      lastY = item.y;
    }

    if (currentLine.length > 0) {
      allLines.push(currentLine.join(" ").replace(/\s+/g, " ").trim());
    }
  }

  return {
    text: allLines.filter(Boolean).join("\n").trim(),
    pageCount: pdf.numPages,
    runs,
  };
}

/** Rebuild plain text from cached PDF runs — no pdf.js (safe on native after session clear). */
export function plainTextFromPdfRuns(runs: PdfTextRun[]): string {
  if (runs.length === 0) return "";

  const sorted = [...runs].sort((a, b) => {
    if (a.page !== b.page) return a.page - b.page;
    const yDiff = b.y - a.y;
    if (Math.abs(yDiff) > 4) return yDiff;
    return a.x - b.x;
  });

  const lines: string[] = [];
  let current: string[] = [];
  let lastPage = sorted[0]!.page;
  let lastY: number | null = null;

  for (const run of sorted) {
    if (
      run.page !== lastPage ||
      (lastY !== null && Math.abs(run.y - lastY) > 4)
    ) {
      if (current.length > 0) {
        lines.push(current.join(" ").replace(/\s+/g, " ").trim());
      }
      current = [];
    }
    current.push(run.str);
    lastPage = run.page;
    lastY = run.y;
  }

  if (current.length > 0) {
    lines.push(current.join(" ").replace(/\s+/g, " ").trim());
  }

  return lines.filter(Boolean).join("\n").trim();
}
