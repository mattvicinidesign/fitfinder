import type { PDFFont } from "npm:pdf-lib@1.17.1";
import { StandardFonts } from "npm:pdf-lib@1.17.1";
import {
  EXPORT_MAX_VISUAL_WIDTH_DELTA_RATIO,
  computeVisualWidthDeltaPercent,
} from "./ats_keyword_optimization.ts";
import type { PdfTextRun } from "./pdf_extract_runs.ts";

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

export type { PdfTextRun };
