import { PDFDocument, rgb, type PDFFont, type PDFPage } from "npm:pdf-lib@1.17.1";
import {
  applyKeywordChangeAtOccurrence,
  buildPhraseBoundaryPattern,
  computeVisualWidthDeltaPercent,
  EXPORT_MAX_VISUAL_WIDTH_DELTA_RATIO,
} from "./ats_keyword_optimization.ts";
import { mapRunFontName, measureTextWidth } from "./pdf_typography.ts";
import type { PdfTextRun } from "./pdf_extract_runs.ts";
import type { AtsKeywordChange } from "./patch_resume_docx.ts";

export type PdfPatchResult = {
  bytes: Uint8Array;
  appliedSubstitutions: AtsKeywordChange[];
  rejectedSubstitutions: AtsKeywordChange[];
};

type PdfLineGroup = {
  page: number;
  y: number;
  runs: PdfTextRun[];
  text: string;
};

type LinePatchPlan = {
  line: PdfLineGroup;
  originalText: string;
  optimizedText: string;
  substitutions: AtsKeywordChange[];
};

function groupRunsIntoLines(runs: PdfTextRun[]): PdfLineGroup[] {
  const sorted = [...runs].sort((a, b) => {
    if (a.page !== b.page) return a.page - b.page;
    const yDiff = b.y - a.y;
    if (Math.abs(yDiff) > 3) return yDiff;
    return a.x - b.x;
  });

  const lines: PdfLineGroup[] = [];
  for (const run of sorted) {
    const last = lines[lines.length - 1];
    if (
      last &&
      last.page === run.page &&
      Math.abs(last.y - run.y) <= 4
    ) {
      last.runs.push(run);
      last.text = last.runs.map((entry) => entry.str).join(" ");
      continue;
    }
    lines.push({
      page: run.page,
      y: run.y,
      runs: [run],
      text: run.str,
    });
  }

  return lines;
}

function lineKey(line: PdfLineGroup): string {
  return `${line.page}:${line.y.toFixed(2)}`;
}

function lineSearchVariants(line: PdfLineGroup): string[] {
  const spaced = line.text;
  const compact = line.runs.map((run) => run.str).join("");
  const normalizedSpaced = spaced.replace(/\s+/g, " ").trim();
  const normalizedCompact = compact.replace(/\s+/g, "").trim();
  return [...new Set([spaced, compact, normalizedSpaced, normalizedCompact])];
}

function findLinesForSubstitution(
  lineGroups: PdfLineGroup[],
  substitution: AtsKeywordChange,
): PdfLineGroup[] {
  const pattern = buildPhraseBoundaryPattern(substitution.before, "i");
  return lineGroups.filter((line) =>
    lineSearchVariants(line).some((text) => pattern.test(text)),
  );
}

function resolveOptimizedLineText(
  originalLine: string,
  optimizedText: string | undefined,
  substitutions: AtsKeywordChange[],
): string {
  if (optimizedText) {
    const optimizedLines = optimizedText.split("\n");
    for (const substitution of substitutions) {
      const afterPattern = buildPhraseBoundaryPattern(substitution.after, "i");
      const match = optimizedLines.find(
        (line) =>
          afterPattern.test(line) &&
          line.slice(0, 2) === originalLine.slice(0, 2),
      );
      if (match) return match;
    }
  }

  let text = originalLine;
  for (const substitution of substitutions) {
    if (buildPhraseBoundaryPattern(substitution.before, "i").test(text)) {
      text = applyKeywordChangeAtOccurrence(text, substitution, 0);
    }
  }
  return text;
}

function buildLinePatchPlans(
  lineGroups: PdfLineGroup[],
  substitutions: AtsKeywordChange[],
  optimizedText?: string,
): LinePatchPlan[] {
  const plans = new Map<string, LinePatchPlan>();

  for (const substitution of substitutions) {
    for (const line of findLinesForSubstitution(lineGroups, substitution)) {
      const key = lineKey(line);
      const existing = plans.get(key) ?? {
        line,
        originalText: line.text,
        optimizedText: line.text,
        substitutions: [],
      };

      if (
        !existing.substitutions.some(
          (entry) =>
            entry.before === substitution.before &&
            entry.after === substitution.after,
        )
      ) {
        existing.substitutions.push(substitution);
      }

      plans.set(key, existing);
    }
  }

  for (const plan of plans.values()) {
    plan.optimizedText = resolveOptimizedLineText(
      plan.originalText,
      optimizedText,
      plan.substitutions,
    );
  }

  return [...plans.values()].filter(
    (plan) => plan.originalText.trim() !== plan.optimizedText.trim(),
  );
}

function lineRenderBounds(line: PdfLineGroup): {
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
} {
  const anchor = line.runs[0]!;
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;

  for (const run of line.runs) {
    minX = Math.min(minX, run.x);
    maxX = Math.max(maxX, run.x + run.width);
  }

  const fontSize = anchor.fontSize;
  return {
    x: minX,
    y: anchor.y - fontSize * 0.2,
    width: Math.max(maxX - minX, anchor.width),
    height: anchor.height ?? fontSize * 1.2,
    fontSize,
  };
}

function passesLineRedrawWidthTolerance(
  font: PDFFont,
  optimizedText: string,
  fontSize: number,
  originalWidth: number,
): boolean {
  const nextWidth = measureTextWidth(font, optimizedText, fontSize);
  if (nextWidth <= originalWidth) return true;
  return (
    computeVisualWidthDeltaPercent(originalWidth, nextWidth) <=
    EXPORT_MAX_VISUAL_WIDTH_DELTA_RATIO
  );
}

function redrawLine(
  page: PDFPage,
  line: PdfLineGroup,
  optimizedText: string,
  font: PDFFont,
): boolean {
  const anchor = line.runs[0]!;
  const bounds = lineRenderBounds(line);

  if (
    !passesLineRedrawWidthTolerance(
      font,
      optimizedText,
      bounds.fontSize,
      bounds.width,
    )
  ) {
    return false;
  }

  page.drawRectangle({
    x: bounds.x - 1,
    y: bounds.y,
    width: bounds.width + 2,
    height: bounds.height,
    color: rgb(1, 1, 1),
    borderWidth: 0,
  });

  page.drawText(optimizedText, {
    x: anchor.x,
    y: anchor.y,
    size: bounds.fontSize,
    font,
    color: rgb(0, 0, 0),
  });

  return true;
}

export async function patchPdfBytes(
  bytes: Uint8Array,
  substitutions: AtsKeywordChange[],
  runs: PdfTextRun[],
  optimizedText?: string,
): Promise<PdfPatchResult> {
  const doc = await PDFDocument.load(bytes);
  const pages = doc.getPages();
  const fontCache = new Map<string, PDFFont>();
  const lineGroups = groupRunsIntoLines(runs);
  const plans = buildLinePatchPlans(lineGroups, substitutions, optimizedText);
  const appliedSubstitutions: AtsKeywordChange[] = [];
  const rejectedSubstitutions: AtsKeywordChange[] = [];
  const appliedKeys = new Set<string>();

  async function getFont(run: PdfTextRun): Promise<PDFFont> {
    const key = mapRunFontName(run.fontName);
    const cached = fontCache.get(key);
    if (cached) return cached;
    const embedded = await doc.embedFont(key);
    fontCache.set(key, embedded);
    return embedded;
  }

  for (const plan of plans) {
    const page = pages[plan.line.page - 1];
    if (!page) {
      for (const substitution of plan.substitutions) {
        rejectedSubstitutions.push(substitution);
      }
      continue;
    }

    const font = await getFont(plan.line.runs[0]!);
    const redrawn = redrawLine(page, plan.line, plan.optimizedText, font);

    if (!redrawn) {
      for (const substitution of plan.substitutions) {
        rejectedSubstitutions.push(substitution);
      }
      continue;
    }

    for (const substitution of plan.substitutions) {
      const subKey = `${substitution.before}→${substitution.after}`;
      if (!appliedKeys.has(subKey)) {
        appliedKeys.add(subKey);
        appliedSubstitutions.push(substitution);
      }
    }
  }

  for (const substitution of substitutions) {
    const applied = appliedSubstitutions.some(
      (entry) =>
        entry.before === substitution.before && entry.after === substitution.after,
    );
    if (
      !applied &&
      !rejectedSubstitutions.some(
        (entry) =>
          entry.before === substitution.before &&
          entry.after === substitution.after,
      )
    ) {
      rejectedSubstitutions.push(substitution);
    }
  }

  return {
    bytes: await doc.save(),
    appliedSubstitutions,
    rejectedSubstitutions,
  };
}
