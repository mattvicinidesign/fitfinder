import {
  applyKeywordChangeAtOccurrence,
  buildPhraseBoundaryPattern,
} from "./ats_keyword_optimization.ts";
import type { PdfTextRun } from "./pdf_extract_runs.ts";
import type { AtsKeywordChange } from "./patch_resume_docx.ts";

export function escapePdfLiteral(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function buildPdfLiteral(text: string): string {
  return `(${escapePdfLiteral(text)})`;
}

function unescapePdfLiteral(value: string): string {
  return value
    .replace(/\\\\/g, "\\")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")");
}

const PDF_LITERAL_RE = /\((?:\\.|[^\\)])*\)/g;

function replaceWithinPdfLiterals(
  content: string,
  before: string,
  after: string,
  occurrence = 0,
): { content: string; patched: boolean } {
  const boundaryPattern = buildPhraseBoundaryPattern(before, "i");
  let patched = false;

  const next = content.replace(PDF_LITERAL_RE, (literal) => {
    const inner = unescapePdfLiteral(literal.slice(1, -1));
    if (!boundaryPattern.test(inner)) return literal;

    const replacePattern = buildPhraseBoundaryPattern(before, "gi");
    let matchIndex = 0;
    const replaced = inner.replace(replacePattern, (match) => {
      const current = matchIndex;
      matchIndex += 1;
      if (current !== occurrence) return match;
      patched = true;
      return findCasePreservedReplacement(match, before, after);
    });

    if (replaced === inner) return literal;
    return buildPdfLiteral(replaced);
  });

  return { content: next, patched };
}

function findCasePreservedReplacement(
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

function replaceNthLiteral(
  content: string,
  oldText: string,
  newText: string,
  occurrence: number,
): string | null {
  const candidates = [
    { oldLiteral: buildPdfLiteral(oldText), newLiteral: buildPdfLiteral(newText) },
    { oldLiteral: `(${oldText})`, newLiteral: `(${newText})` },
  ];

  for (const { oldLiteral, newLiteral } of candidates) {
    let index = -1;
    for (let i = 0; i <= occurrence; i += 1) {
      index = content.indexOf(oldLiteral, index + 1);
      if (index === -1) break;
    }
    if (index === -1) continue;
    return (
      content.slice(0, index) +
      newLiteral +
      content.slice(index + oldLiteral.length)
    );
  }

  return null;
}

function replaceAllLiterals(
  content: string,
  oldText: string,
  newText: string,
): { content: string; patched: boolean } {
  const oldLiteral = buildPdfLiteral(oldText);
  const newLiteral = buildPdfLiteral(newText);
  if (content.includes(oldLiteral)) {
    return { content: content.split(oldLiteral).join(newLiteral), patched: true };
  }

  const altOld = `(${oldText})`;
  if (content.includes(altOld)) {
    return {
      content: content.split(altOld).join(`(${newText})`),
      patched: true,
    };
  }

  return { content, patched: false };
}

type PdfLineGroup = {
  page: number;
  y: number;
  runs: PdfTextRun[];
  text: string;
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

function lineSearchVariants(line: PdfLineGroup): string[] {
  const spaced = line.text;
  const compact = line.runs.map((run) => run.str).join("");
  const normalizedSpaced = spaced.replace(/\s+/g, " ").trim();
  const normalizedCompact = compact.replace(/\s+/g, "").trim();
  return [...new Set([spaced, compact, normalizedSpaced, normalizedCompact])];
}

function findTargetLine(
  lineGroups: PdfLineGroup[],
  substitution: AtsKeywordChange,
): PdfLineGroup | null {
  const pattern = buildPhraseBoundaryPattern(substitution.before, "i");
  const matches = lineGroups.filter((line) =>
    lineSearchVariants(line).some((text) => pattern.test(text)),
  );
  if (matches.length === 0) return null;
  if (matches.length === 1) return matches[0]!;

  if (typeof substitution.lineIndex === "number") {
    const byIndex = matches.find((line) => {
      const lineIndex = lineGroups.indexOf(line);
      return lineIndex === substitution.lineIndex;
    });
    if (byIndex) return byIndex;
  }

  if (substitution.originalBulletText) {
    const bulletPattern = buildPhraseBoundaryPattern(
      substitution.originalBulletText.slice(0, 24),
      "i",
    );
    const byBullet = matches.find((line) =>
      lineSearchVariants(line).some((text) => bulletPattern.test(text)),
    );
    if (byBullet) return byBullet;
  }

  return matches[0]!;
}

function patchSingleRunLiteral(
  content: string,
  run: PdfTextRun,
  substitution: AtsKeywordChange,
): { content: string; patched: boolean } {
  const pattern = buildPhraseBoundaryPattern(substitution.before, "i");
  if (!pattern.test(run.str)) {
    return { content, patched: false };
  }

  const replacement = findCasePreservedReplacement(
    run.str,
    substitution.before,
    substitution.after,
  );
  const nextRunText = applyKeywordChangeAtOccurrence(
    run.str,
    { ...substitution, after: replacement },
    substitution.matchIndex ?? 0,
  );
  if (nextRunText === run.str) {
    return { content, patched: false };
  }

  const occurrence = substitution.matchIndex ?? 0;
  const next = replaceNthLiteral(content, run.str, nextRunText, occurrence);
  if (next !== null) {
    return { content: next, patched: true };
  }

  return replaceAllLiterals(content, run.str, nextRunText);
}

function patchMultiRunLineLiterals(
  content: string,
  line: PdfLineGroup,
  substitution: AtsKeywordChange,
): { content: string; patched: boolean } {
  const compact = line.runs.map((run) => run.str).join("");
  const pattern = buildPhraseBoundaryPattern(substitution.before, "i");
  const match = pattern.exec(compact);
  if (!match || match.index === undefined) {
    return { content, patched: false };
  }

  const replacement = findCasePreservedReplacement(
    match[0],
    substitution.before,
    substitution.after,
  );
  const newCompact = applyKeywordChangeAtOccurrence(
    compact,
    { ...substitution, after: replacement },
    substitution.matchIndex ?? 0,
  );
  if (newCompact === compact) {
    return { content, patched: false };
  }

  const matchStart = match.index;
  const matchEnd = matchStart + match[0].length;
  const delta = newCompact.length - compact.length;
  let pos = 0;
  let nextContent = content;
  let patched = false;

  for (const run of line.runs) {
    const runStart = pos;
    const runEnd = pos + run.str.length;
    pos = runEnd;

    if (runEnd <= matchStart || runStart >= matchEnd) {
      continue;
    }

    let newRunText: string;
    if (runStart <= matchStart && runEnd >= matchEnd) {
      const prefix = run.str.slice(0, matchStart - runStart);
      const suffix = run.str.slice(matchEnd - runStart);
      const inserted = newCompact.slice(matchStart, matchEnd + delta);
      newRunText = prefix + inserted + suffix;
    } else if (runStart < matchStart) {
      const prefix = run.str.slice(0, matchStart - runStart);
      const inserted = newCompact.slice(matchStart, runEnd + delta);
      newRunText = prefix + inserted;
    } else if (runEnd > matchEnd) {
      const suffix = run.str.slice(matchEnd - runStart);
      const inserted = newCompact.slice(runStart, matchEnd + delta);
      newRunText = inserted + suffix;
    } else {
      newRunText = newCompact.slice(runStart, runEnd + delta);
    }

    const result = replaceAllLiterals(nextContent, run.str, newRunText);
    if (result.patched) {
      nextContent = result.content;
      patched = true;
    }
  }

  return { content: nextContent, patched };
}

function patchSubstitutionWithRuns(
  content: string,
  lineGroups: PdfLineGroup[],
  substitution: AtsKeywordChange,
): { content: string; patched: boolean } {
  const line = findTargetLine(lineGroups, substitution);
  if (!line) {
    return { content, patched: false };
  }

  for (const run of line.runs) {
    const singleRun = patchSingleRunLiteral(content, run, substitution);
    if (singleRun.patched) {
      return singleRun;
    }
  }

  return patchMultiRunLineLiterals(content, line, substitution);
}

/** Patch PDF bytes in-place by replacing content-stream string literals only. */
export function patchPdfContentStreamBytes(
  bytes: Uint8Array,
  substitutions: AtsKeywordChange[],
  runs: PdfTextRun[] = [],
): {
  bytes: Uint8Array;
  appliedSubstitutions: AtsKeywordChange[];
  rejectedSubstitutions: AtsKeywordChange[];
} {
  let content = new TextDecoder("latin1").decode(bytes);
  const lineGroups = runs.length > 0 ? groupRunsIntoLines(runs) : [];
  const appliedSubstitutions: AtsKeywordChange[] = [];
  const rejectedSubstitutions: AtsKeywordChange[] = [];

  for (const substitution of substitutions) {
    let patched = false;

    if (lineGroups.length > 0) {
      const targeted = patchSubstitutionWithRuns(content, lineGroups, substitution);
      if (targeted.patched) {
        content = targeted.content;
        patched = true;
      }
    }

    if (!patched) {
      const replacement = findCasePreservedReplacement(
        substitution.before,
        substitution.before,
        substitution.after,
      );
      const global = replaceAllLiterals(content, substitution.before, replacement);
      if (global.patched) {
        content = global.content;
        patched = true;
      } else {
        const within = replaceWithinPdfLiterals(
          content,
          substitution.before,
          replacement,
          substitution.matchIndex ?? 0,
        );
        if (within.patched) {
          content = within.content;
          patched = true;
        }
      }
    }

    if (patched) {
      appliedSubstitutions.push(substitution);
    } else {
      rejectedSubstitutions.push(substitution);
    }
  }

  return {
    bytes: new TextEncoder().encode(content),
    appliedSubstitutions,
    rejectedSubstitutions,
  };
}
