"use client";

import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import {
  findCasePreservedReplacement,
  mapRunFontName,
  passesPdfVisualWidthTolerance,
  unionSegmentRenderBounds,
  type PdfMatchSegment,
} from "@/lib/pdf-typography";
import type { PdfTextRun } from "@/lib/extract-resume-pdf-runs";
import type { AtsKeywordChange } from "@/lib/types";

export type PdfPatchResult = {
  blob: Blob;
  appliedSubstitutions: AtsKeywordChange[];
  rejectedSubstitutions: AtsKeywordChange[];
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

type PdfLineGroup = {
  page: number;
  y: number;
  runs: PdfTextRun[];
  text: string;
};

type LinePhraseMatch = {
  line: PdfLineGroup;
  matchStart: number;
  matchedText: string;
};

type LineCharRef =
  | { runIndex: number; charIndex: number }
  | "separator";

function buildLineModel(runs: PdfTextRun[]): {
  text: string;
  charRefs: LineCharRef[];
} {
  let text = "";
  const charRefs: LineCharRef[] = [];

  for (let runIndex = 0; runIndex < runs.length; runIndex += 1) {
    const run = runs[runIndex]!;
    if (runIndex > 0) {
      text += " ";
      charRefs.push("separator");
    }
    for (let charIndex = 0; charIndex < run.str.length; charIndex += 1) {
      text += run.str[charIndex];
      charRefs.push({ runIndex, charIndex });
    }
  }

  return { text, charRefs };
}

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
      const model = buildLineModel(last.runs);
      last.text = model.text;
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

function phrasePattern(before: string): RegExp {
  const parts = before
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(escapeRegExp);
  if (parts.length === 0) {
    return new RegExp(escapeRegExp(before), "i");
  }
  return new RegExp(parts.join("\\s+"), "i");
}

function findLinePhraseMatches(
  lines: PdfLineGroup[],
  substitution: AtsKeywordChange,
): LinePhraseMatch[] {
  const pattern = phrasePattern(substitution.before);
  const matches: LinePhraseMatch[] = [];

  for (const line of lines) {
    const match = pattern.exec(line.text);
    if (!match || match.index == null) continue;
    matches.push({
      line,
      matchStart: match.index,
      matchedText: match[0],
    });
  }

  return matches;
}

function mapCharRangeToRuns(
  line: PdfLineGroup,
  matchStart: number,
  matchLength: number,
): PdfMatchSegment[] {
  const model = buildLineModel(line.runs);
  const segments: PdfMatchSegment[] = [];
  const seenRuns = new Map<PdfTextRun, { startInRun: number; endInRun: number }>();

  for (let index = matchStart; index < matchStart + matchLength; index += 1) {
    const ref = model.charRefs[index];
    if (!ref || ref === "separator") continue;
    const run = line.runs[ref.runIndex]!;
    const existing = seenRuns.get(run);
    if (!existing) {
      seenRuns.set(run, {
        startInRun: ref.charIndex,
        endInRun: ref.charIndex + 1,
      });
      continue;
    }
    existing.startInRun = Math.min(existing.startInRun, ref.charIndex);
    existing.endInRun = Math.max(existing.endInRun, ref.charIndex + 1);
  }

  for (const [run, bounds] of seenRuns) {
    segments.push({ run, ...bounds });
  }

  segments.sort((a, b) => a.run.x - b.run.x);
  return segments;
}

async function overlayReplacement(
  page: PDFPage,
  line: PdfLineGroup,
  matchStart: number,
  matchedText: string,
  substitution: AtsKeywordChange,
  getFont: (run: PdfTextRun) => Promise<PDFFont>,
): Promise<boolean> {
  const replacementText = findCasePreservedReplacement(
    line.text,
    substitution.before,
    substitution.after,
  );
  if (replacementText === matchedText) return false;

  const segments = mapCharRangeToRuns(line, matchStart, matchedText.length);
  if (segments.length === 0) return false;

  const font = await getFont(segments[0]!.run);
  const bounds = unionSegmentRenderBounds(segments);
  if (!bounds || bounds.width <= 0) return false;

  if (
    !passesPdfVisualWidthTolerance(
      font,
      replacementText,
      bounds.fontSize,
      bounds.width,
    )
  ) {
    return false;
  }

  const replacementWidth = font.widthOfTextAtSize(
    replacementText,
    bounds.fontSize,
  );
  const maskWidth = Math.max(bounds.width, replacementWidth);

  page.drawRectangle({
    x: bounds.x,
    y: bounds.y,
    width: maskWidth,
    height: bounds.height,
    color: rgb(1, 1, 1),
    borderWidth: 0,
  });

  page.drawText(replacementText, {
    x: bounds.x,
    y: segments[0]!.run.y,
    size: bounds.fontSize,
    font,
    color: rgb(0, 0, 0),
  });

  return true;
}

/** Overlay approved phrase swaps on the original PDF using line-aware run matching. */
export async function patchPdfBlob(
  blob: Blob,
  substitutions: AtsKeywordChange[],
  runs: PdfTextRun[],
): Promise<PdfPatchResult> {
  const doc = await PDFDocument.load(await blob.arrayBuffer());
  const pages = doc.getPages();
  const fontCache = new Map<string, PDFFont>();
  const lineGroups = groupRunsIntoLines(runs);
  const appliedSubstitutions: AtsKeywordChange[] = [];
  const rejectedSubstitutions: AtsKeywordChange[] = [];

  async function getFont(run: PdfTextRun): Promise<PDFFont> {
    const key = mapRunFontName(run.fontName);
    const cached = fontCache.get(key);
    if (cached) return cached;
    const embedded = await doc.embedFont(key);
    fontCache.set(key, embedded);
    return embedded;
  }

  for (const substitution of substitutions) {
    const matches = findLinePhraseMatches(lineGroups, substitution);
    if (matches.length === 0) {
      rejectedSubstitutions.push(substitution);
      continue;
    }

    let appliedForSubstitution = false;

    for (const { line, matchStart, matchedText } of matches) {
      const page = pages[line.page - 1];
      if (!page) continue;

      const applied = await overlayReplacement(
        page,
        line,
        matchStart,
        matchedText,
        substitution,
        getFont,
      );
      if (applied) appliedForSubstitution = true;
    }

    if (appliedForSubstitution) {
      appliedSubstitutions.push(substitution);
    } else {
      rejectedSubstitutions.push(substitution);
    }
  }

  const bytes = await doc.save();
  return {
    blob: new Blob([bytes as BlobPart], { type: "application/pdf" }),
    appliedSubstitutions,
    rejectedSubstitutions,
  };
}
