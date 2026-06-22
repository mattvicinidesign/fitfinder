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
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data }).promise;
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
