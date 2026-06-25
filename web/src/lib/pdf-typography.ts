import type { PDFFont } from "pdf-lib";
import { StandardFonts } from "pdf-lib";
import {
  EXPORT_MAX_VISUAL_WIDTH_DELTA_RATIO,
  computeVisualWidthDeltaPercent,
} from "@/lib/ats-keyword-optimization-core";
import type { PdfTextRun } from "@/lib/extract-resume-pdf-runs";

export function mapRunFontName(fontName: string | undefined): StandardFonts {
  const normalized = (fontName ?? "").toLowerCase();
  if (normalized.includes("times") || normalized.includes("serif")) {
    if (normalized.includes("bold") || normalized.includes("italic")) {
      return StandardFonts.TimesRomanBold;
    }
    return StandardFonts.TimesRoman;
  }
  if (normalized.includes("courier") || normalized.includes("mono")) {
    return StandardFonts.Courier;
  }
  if (normalized.includes("bold")) {
    return StandardFonts.HelveticaBold;
  }
  return StandardFonts.Helvetica;
}

export function runCharWidth(run: PdfTextRun): number {
  return run.avgCharWidth ?? run.width / Math.max(run.str.length, 1);
}

export function runSubstringRenderBounds(
  run: PdfTextRun,
  startInRun: number,
  endInRun: number,
): { x: number; width: number } {
  const safeLength = Math.max(run.str.length, 1);
  const span = Math.max(endInRun - startInRun, 0);
  return {
    x: run.x + run.width * (startInRun / safeLength),
    width: run.width * (span / safeLength),
  };
}

export type PdfMatchSegment = {
  run: PdfTextRun;
  startInRun: number;
  endInRun: number;
};

export function unionSegmentRenderBounds(
  segments: PdfMatchSegment[],
): { x: number; y: number; width: number; height: number; fontSize: number } | null {
  const first = segments[0];
  if (!first) return null;

  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  const fontSize = first.run.fontSize;

  for (const segment of segments) {
    const bounds = runSubstringRenderBounds(
      segment.run,
      segment.startInRun,
      segment.endInRun,
    );
    minX = Math.min(minX, bounds.x);
    maxX = Math.max(maxX, bounds.x + bounds.width);
  }

  return {
    x: minX,
    y: first.run.y - fontSize * 0.15,
    width: Math.max(maxX - minX, 0),
    height: first.run.height ?? fontSize * 1.12,
    fontSize,
  };
}

export function substringRenderBounds(
  run: PdfTextRun,
  matchStart: number,
  matchLength: number,
): { x: number; y: number; width: number; height: number } {
  const safeLength = Math.max(run.str.length, 1);
  const startRatio = matchStart / safeLength;
  const lengthRatio = matchLength / safeLength;
  const charWidth = run.avgCharWidth ?? run.width / safeLength;

  return {
    x: run.x + run.width * startRatio,
    y: run.y,
    width: Math.max(run.width * lengthRatio, charWidth * matchLength),
    height: run.height ?? run.fontSize * 1.15,
  };
}

export function measureTextWidth(
  font: PDFFont,
  text: string,
  fontSize: number,
): number {
  return font.widthOfTextAtSize(text, fontSize);
}

export function passesPdfVisualWidthTolerance(
  font: PDFFont,
  replacementText: string,
  fontSize: number,
  originalRenderedWidth: number,
): boolean {
  const replacementWidth = measureTextWidth(font, replacementText, fontSize);
  if (replacementWidth <= originalRenderedWidth) return true;
  return (
    computeVisualWidthDeltaPercent(originalRenderedWidth, replacementWidth) <=
    EXPORT_MAX_VISUAL_WIDTH_DELTA_RATIO
  );
}

export function findCasePreservedReplacement(
  sourceText: string,
  before: string,
  after: string,
): string {
  const pattern = new RegExp(
    before.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    "i",
  );
  const match = sourceText.match(pattern);
  if (!match) return after;

  const matched = match[0];
  if (matched === matched.toUpperCase()) return after.toUpperCase();
  if (matched[0] === matched[0]?.toUpperCase()) {
    return after.charAt(0).toUpperCase() + after.slice(1);
  }
  return after;
}
