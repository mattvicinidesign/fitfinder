/** ATS keyword optimization — extremely conservative in-place edits only. */

export interface AtsKeywordChange {
  before: string;
  after: string;
}

export type AtsSafetyScore = "low" | "medium" | "high";

export const ATS_MAX_TEXT_MODIFICATION_RATIO = 0.05;
export const ATS_MAX_KEYWORD_SWAPS = 15;
export const ATS_PREVIEW_KEYWORD_CHANGE_COUNT = ATS_MAX_KEYWORD_SWAPS;
export const ATS_MAX_KEYWORD_OCCURRENCES = 3;
export const MAX_REPLACEMENT_LENGTH_RATIO = 2;
export const MAX_BULLET_LENGTH_DELTA_RATIO = 0.15;
export const MAX_BULLET_LENGTH_DELTA_ABS = 12;
export const MIN_UNCHANGED_BULLET_RATIO = 0.85;

export const ATS_OPTIMIZATION_POLICY = `
ATS optimization is keyword-only surgery, not resume rewriting.

The optimized resume must be visually, structurally, and semantically identical to the original.
A hiring manager should not be able to tell the resume was rewritten.

Preserve 100% of companies, job titles, dates, metrics, project names, education,
certifications, contact information, section order, bullet count, line count, and structure.

Only targeted keyword substitutions within existing bullet points.
Maximum 5% document modification and 15 keyword swaps total.
`.trim();

/** Short, voice-neutral swaps — no buzzword inflation. */
export const KEYWORD_REPLACEMENT_POOL: AtsKeywordChange[] = [
  { before: "Helped", after: "Led" },
  { before: "Helped to", after: "Led" },
  { before: "Helped with", after: "Supported" },
  { before: "Made", after: "Built" },
  { before: "Worked on", after: "Delivered" },
  { before: "Worked On", after: "Delivered" },
  { before: "Worked with", after: "Partnered with" },
  { before: "Worked With", after: "Partnered with" },
  { before: "Used", after: "Applied" },
  { before: "Utilized", after: "Applied" },
  { before: "Fixed", after: "Resolved" },
  { before: "Changed", after: "Improved" },
  { before: "Looked at", after: "Reviewed" },
  { before: "Looked At", after: "Reviewed" },
  { before: "Talked to", after: "Met with" },
  { before: "Talked To", after: "Met with" },
  { before: "Set up", after: "Built" },
  { before: "Set Up", after: "Built" },
  { before: "Ran", after: "Led" },
  { before: "Started", after: "Launched" },
  { before: "Finished", after: "Completed" },
  { before: "Got", after: "Achieved" },
  { before: "Wrote", after: "Drafted" },
  { before: "Showed", after: "Presented" },
  { before: "Many", after: "Several" },
  { before: "Various", after: "Multiple" },
  { before: "Did", after: "Completed" },
  { before: "Handled", after: "Managed" },
  { before: "Built", after: "Developed" },
  { before: "Created", after: "Designed" },
  { before: "Responsible for", after: "Managed" },
  { before: "Responsible For", after: "Managed" },
  { before: "Assisted", after: "Supported" },
  { before: "Assisted with", after: "Supported" },
  { before: "Assisted With", after: "Supported" },
  { before: "Participated in", after: "Contributed to" },
  { before: "Participated In", after: "Contributed to" },
  { before: "In charge of", after: "Led" },
  { before: "In Charge Of", after: "Led" },
  { before: "A variety of", after: "Multiple" },
  { before: "A Variety Of", after: "Multiple" },
];

export const ATS_NO_KEYWORDS_MESSAGE =
  "Your resume already uses strong, ATS-friendly wording. No keyword swaps are needed.";

const CORPORATE_BUZZWORD_PATTERN =
  /\b(synerg(?:y|ies|ize|istic)|paradigm|operationaliz(?:e|ed|ing)|conceptualiz(?:e|ed|ing)|holistic|best-in-class|world-class|cutting-edge|leveraged|value-add|streamlin(?:e|ed|ing)|best practices|cross-functional(?:ly)?|enterprise-wide|transformational|disrupt(?:ive|ion)|rockstar|ninja|guru)\b/i;

const DATE_PATTERN =
  /\b(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}|(?:19|20)\d{2}\s*[-–—]\s*(?:Present|\d{4})|\d{1,2}\/\d{4})\b/gi;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function isBulletLine(line: string): boolean {
  return /^\s*([-•*–—●◦▪]|(?:\u2022))\s*\S/.test(line) ||
    /^\s*([-•*–—]|\d+[.)])\s+\S/.test(line);
}

function isContactLine(line: string): boolean {
  const trimmed = line.trim();
  return (
    /^[\w.+-]+@[\w.-]+\.\w+/.test(trimmed) ||
    /^https?:\/\//i.test(trimmed) ||
    /linkedin\.com/i.test(trimmed) ||
    /^\+?\d[\d\s().-]{7,}\d$/.test(trimmed)
  );
}

function isSummaryLikeLine(line: string): boolean {
  const lower = line.trim().toLowerCase();
  return (
    /\b(years of experience|seeking|passionate about|summary|profile)\b/.test(
      lower,
    ) && !isBulletLine(line)
  );
}

/** Accomplishment lines — includes PDF-extracted bullets without marker characters. */
export function isScannableAccomplishmentLine(line: string): boolean {
  if (isBulletLine(line)) return true;

  const trimmed = line.trim();
  if (!trimmed || trimmed.length < 16 || trimmed.length > 280) return false;
  if (
    isSectionHeader(line) ||
    isExperienceHeaderLine(line) ||
    isContactLine(line) ||
    isSummaryLikeLine(line)
  ) {
    return false;
  }
  if (trimmed === trimmed.toUpperCase() && trimmed.length <= 48) return false;

  const wordCount = trimmed.split(/\s+/).length;
  if (wordCount < 4 || wordCount > 45) return false;

  return /^[("'"•\-*\dA-Za-z]/.test(trimmed);
}

function getExperienceSectionRange(
  lines: string[],
): { start: number; end: number } | null {
  let start = -1;

  for (let i = 0; i < lines.length; i += 1) {
    const normalized = lines[i]!
      .trim()
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .trim();

    if (
      /^(experience|work experience|professional experience|employment history)$/.test(
        normalized,
      )
    ) {
      start = i + 1;
      continue;
    }

    if (start >= 0 && isSectionHeader(lines[i]!)) {
      return { start, end: i };
    }
  }

  if (start >= 0) return { start, end: lines.length };
  return null;
}

function isLineInScannableRegion(lineIndex: number, lines: string[]): boolean {
  const range = getExperienceSectionRange(lines);
  if (range) {
    return lineIndex >= range.start && lineIndex < range.end;
  }

  // PDFs often omit section headers — skip likely header/summary block.
  return lineIndex >= Math.min(4, Math.max(0, lines.length - 1));
}

function isScannableLine(line: string, lineIndex: number, lines: string[]): boolean {
  return (
    isScannableAccomplishmentLine(line) &&
    isLineInScannableRegion(lineIndex, lines)
  );
}

function countBulletLines(text: string): number {
  return text.split("\n").filter((line) => isBulletLine(line)).length;
}

function isSectionHeader(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || isBulletLine(line)) return false;

  const normalized = trimmed.toLowerCase().replace(/[^\w\s]/g, "").trim();
  if (
    /^(summary|profile|experience|work experience|employment|education|skills|technical skills|certifications|projects|contact|awards|publications)$/.test(
      normalized,
    )
  ) {
    return true;
  }

  return (
    trimmed.length <= 36 &&
    trimmed === trimmed.toUpperCase() &&
    /[A-Z]/.test(trimmed)
  );
}

function isExperienceHeaderLine(line: string): boolean {
  if (isBulletLine(line) || isSectionHeader(line)) return false;
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 140) return false;

  if (/\|/.test(trimmed) && DATE_PATTERN.test(trimmed)) return true;
  if (/\b(19|20)\d{2}\b/.test(trimmed) && trimmed.length < 120) return true;
  if (/\bat\b.+\b(19|20)\d{2}\b/i.test(trimmed)) return true;

  return false;
}

function countSections(text: string): number {
  return text.split("\n").filter((line) => isSectionHeader(line)).length;
}

function countExperienceHeaderLines(text: string): number {
  return text.split("\n").filter((line) => isExperienceHeaderLine(line)).length;
}

function countDateMentions(text: string): number {
  return (text.match(DATE_PATTERN) ?? []).length;
}

export interface ResumeStructureFingerprint {
  lineCount: number;
  bulletCount: number;
  sectionCount: number;
  companyLineCount: number;
  jobTitleLineCount: number;
  dateCount: number;
}

export function extractResumeStructureFingerprint(
  text: string,
): ResumeStructureFingerprint {
  const experienceHeaders = countExperienceHeaderLines(text);
  return {
    lineCount: text.split("\n").length,
    bulletCount: countBulletLines(text),
    sectionCount: countSections(text),
    companyLineCount: experienceHeaders,
    jobTitleLineCount: experienceHeaders,
    dateCount: countDateMentions(text),
  };
}

function fingerprintsEqual(
  a: ResumeStructureFingerprint,
  b: ResumeStructureFingerprint,
): boolean {
  return (
    a.lineCount === b.lineCount &&
    a.bulletCount === b.bulletCount &&
    a.sectionCount === b.sectionCount &&
    a.companyLineCount === b.companyLineCount &&
    a.jobTitleLineCount === b.jobTitleLineCount &&
    a.dateCount === b.dateCount
  );
}

function countPhraseOccurrences(text: string, phrase: string): number {
  if (!phrase.trim()) return 0;
  const pattern = new RegExp(
    `(?<![\\w-])${escapeRegExp(phrase)}(?![\\w-])`,
    "gi",
  );
  return (text.match(pattern) ?? []).length;
}

function containsBlockedBuzzwords(after: string, originalResume: string): boolean {
  if (!CORPORATE_BUZZWORD_PATTERN.test(after)) return false;
  const lowerAfter = after.toLowerCase();
  return !originalResume.toLowerCase().includes(lowerAfter);
}

function applySingleSwapOnLine(line: string, change: AtsKeywordChange): string {
  const pattern = new RegExp(escapeRegExp(change.before), "i");
  return line.replace(pattern, change.after);
}

function lineIsSingleKeywordSwap(
  original: string,
  modified: string,
  pool: AtsKeywordChange[] = KEYWORD_REPLACEMENT_POOL,
): boolean {
  if (original === modified) return true;

  for (const change of pool) {
    const pattern = new RegExp(escapeRegExp(change.before), "i");
    const match = original.match(pattern);
    if (!match || match.index == null) continue;

    const idx = match.index;
    const matched = match[0];
    const expected =
      original.slice(0, idx) +
      change.after +
      original.slice(idx + matched.length);

    if (expected === modified) return true;
  }

  return false;
}

function passesGoldenRule(
  originalLine: string,
  modifiedLine: string,
  change: AtsKeywordChange,
): boolean {
  if (originalLine === modifiedLine) return false;
  if (!lineIsSingleKeywordSwap(originalLine, modifiedLine, [change])) return false;

  if (change.after.length > change.before.length * MAX_REPLACEMENT_LENGTH_RATIO) {
    return false;
  }

  const unchangedRatio =
    (originalLine.length - change.before.length) / Math.max(originalLine.length, 1);
  if (unchangedRatio < MIN_UNCHANGED_BULLET_RATIO) return false;

  const lengthDelta = Math.abs(modifiedLine.length - originalLine.length);
  const maxDelta = Math.max(
    MAX_BULLET_LENGTH_DELTA_ABS,
    originalLine.length * MAX_BULLET_LENGTH_DELTA_RATIO,
  );
  if (lengthDelta > maxDelta) return false;

  return true;
}

function nonBulletLinesIdentical(original: string, modified: string): boolean {
  const originalLines = original.split("\n");
  const modifiedLines = modified.split("\n");
  if (originalLines.length !== modifiedLines.length) return false;

  for (let i = 0; i < originalLines.length; i += 1) {
    if (isBulletLine(originalLines[i]!)) continue;
    if (originalLines[i] === modifiedLines[i]) continue;
    if (lineIsSingleKeywordSwap(originalLines[i]!, modifiedLines[i]!)) continue;
    return false;
  }

  return true;
}

export function validateResumeStructurePreserved(
  original: string,
  modified: string,
): boolean {
  const originalLines = original.split("\n");
  const modifiedLines = modified.split("\n");

  if (originalLines.length !== modifiedLines.length) return false;
  if (countBulletLines(original) !== countBulletLines(modified)) return false;
  if (
    !fingerprintsEqual(
      extractResumeStructureFingerprint(original),
      extractResumeStructureFingerprint(modified),
    )
  ) {
    return false;
  }
  if (!nonBulletLinesIdentical(original, modified)) return false;

  for (let i = 0; i < originalLines.length; i += 1) {
    if (!lineIsSingleKeywordSwap(originalLines[i]!, modifiedLines[i]!)) {
      return false;
    }
  }

  return true;
}

function modificationCost(change: AtsKeywordChange): number {
  return change.before.length;
}

function computeModificationRatio(
  text: string,
  changes: AtsKeywordChange[],
): number {
  if (!text.length) return 0;
  const total = changes.reduce(
    (sum, change) => sum + modificationCost(change),
    0,
  );
  return total / text.length;
}

export function classifyAtsSafetyScore(editCount: number): AtsSafetyScore {
  if (editCount <= 5) return "low";
  if (editCount <= 10) return "medium";
  return "high";
}

export function formatAtsSafetyScoreLabel(score: AtsSafetyScore): string {
  switch (score) {
    case "low":
      return "Low impact";
    case "medium":
      return "Medium impact";
    default:
      return "High impact";
  }
}

type ScannedChange = AtsKeywordChange & {
  lineIndex: number;
  matchIndex: number;
};

function isConservativeCandidate(
  change: AtsKeywordChange,
  line: string,
  resumeText: string,
  plannedAfterCounts: Map<string, number>,
): boolean {
  if (change.after.length > change.before.length * MAX_REPLACEMENT_LENGTH_RATIO) {
    return false;
  }

  if (containsBlockedBuzzwords(change.after, resumeText)) return false;

  const existingAfterCount = countPhraseOccurrences(resumeText, change.after);
  const plannedCount =
    (plannedAfterCounts.get(change.after.toLowerCase()) ?? existingAfterCount);
  if (plannedCount >= ATS_MAX_KEYWORD_OCCURRENCES) return false;

  const modifiedLine = applySingleSwapOnLine(line, change);
  return passesGoldenRule(line, modifiedLine, change);
}

export function scanResumeForKeywordChanges(
  resumeText: string,
  maxCount = ATS_MAX_KEYWORD_SWAPS,
): AtsKeywordChange[] {
  const lines = resumeText.split("\n");
  const candidates: ScannedChange[] = [];
  const usedSpans = new Set<string>();

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex]!;
    if (!isScannableLine(line, lineIndex, lines)) continue;

    for (const change of KEYWORD_REPLACEMENT_POOL) {
      const pattern = new RegExp(escapeRegExp(change.before), "gi");
      let match: RegExpExecArray | null;

      while ((match = pattern.exec(line)) !== null) {
        const spanKey = `${lineIndex}:${match.index}:${change.before.toLowerCase()}`;
        if (usedSpans.has(spanKey)) continue;

        usedSpans.add(spanKey);
        candidates.push({
          before: change.before,
          after: change.after,
          lineIndex,
          matchIndex: match.index,
        });
      }
    }
  }

  candidates.sort((a, b) => {
    if (a.lineIndex !== b.lineIndex) return a.lineIndex - b.lineIndex;
    if (a.matchIndex !== b.matchIndex) return a.matchIndex - b.matchIndex;
    return 0;
  });

  const selected: AtsKeywordChange[] = [];
  const plannedAfterCounts = new Map<string, number>();
  let modificationChars = 0;
  const maxModificationChars = Math.floor(
    resumeText.length * ATS_MAX_TEXT_MODIFICATION_RATIO,
  );

  for (const candidate of candidates) {
    if (selected.length >= maxCount) break;

    const line = lines[candidate.lineIndex]!;
    if (
      !isConservativeCandidate(
        candidate,
        line,
        resumeText,
        plannedAfterCounts,
      )
    ) {
      continue;
    }

    const cost = modificationCost(candidate);
    if (selected.length > 0 && modificationChars + cost > maxModificationChars) {
      break;
    }

    selected.push({ before: candidate.before, after: candidate.after });
    modificationChars += cost;

    const afterKey = candidate.after.toLowerCase();
    const existing = countPhraseOccurrences(resumeText, candidate.after);
    plannedAfterCounts.set(
      afterKey,
      (plannedAfterCounts.get(afterKey) ?? existing) + 1,
    );
  }

  return selected;
}

export function occurrenceIndexForChange(
  changes: AtsKeywordChange[],
  index: number,
): number {
  const target = changes[index]?.before.toLowerCase();
  if (!target) return 0;

  let count = 0;
  for (let i = 0; i < index; i += 1) {
    if (changes[i]?.before.toLowerCase() === target) count += 1;
  }
  return count;
}

export function applyKeywordChangeAtOccurrence(
  text: string,
  change: AtsKeywordChange,
  occurrence: number,
): string {
  const pattern = new RegExp(escapeRegExp(change.before), "gi");
  let matchIndex = 0;

  return text.replace(pattern, (match) => {
    const current = matchIndex;
    matchIndex += 1;
    return current === occurrence ? change.after : match;
  });
}

export function buildOptimizedResumeText(
  originalText: string,
  changes: AtsKeywordChange[],
  approvedIndices: number[],
): string {
  let text = originalText;

  for (const index of approvedIndices) {
    const change = changes[index];
    if (!change) continue;
    const occurrence = occurrenceIndexForChange(changes, index);
    text = applyKeywordChangeAtOccurrence(text, change, occurrence);
  }

  if (!validateResumeStructurePreserved(originalText, text)) {
    throw new Error(
      "Optimized resume failed conservative validation. No changes were applied.",
    );
  }

  return text;
}

export function computeOptimizedAtsScore(
  originalScore: number,
  approvedCount: number,
  scannedCount: number,
): { optimizedATSScore: number; improvementPercentage: number } {
  if (scannedCount <= 0 || approvedCount <= 0) {
    return { optimizedATSScore: originalScore, improvementPercentage: 0 };
  }

  const fullBoost = Math.max(
    6,
    Math.min(14, Math.round((100 - originalScore) * 0.16)),
  );
  const improvementPercentage = Math.round(
    fullBoost * (approvedCount / scannedCount),
  );
  const optimizedATSScore = Math.min(
    100,
    originalScore + improvementPercentage,
  );

  return { optimizedATSScore, improvementPercentage };
}

export function buildAtsOptimizationScanResult(
  resumeText: string,
  originalATSScore: number,
) {
  const keywordChanges = scanResumeForKeywordChanges(resumeText);
  const totalKeywordEdits = keywordChanges.length;
  const atsSafetyScore = classifyAtsSafetyScore(totalKeywordEdits);
  const previewCount = Math.min(
    keywordChanges.length,
    ATS_PREVIEW_KEYWORD_CHANGE_COUNT,
  );
  const projected = computeOptimizedAtsScore(
    originalATSScore,
    previewCount,
    Math.max(keywordChanges.length, 1),
  );

  return {
    originalATSScore,
    optimizedATSScore: projected.optimizedATSScore,
    improvementPercentage: projected.improvementPercentage,
    scanCompleted: true,
    optimizationApplied: false,
    optimizedResumeText: resumeText,
    originalResumeText: resumeText,
    keywordChanges,
    totalKeywordEdits,
    atsSafetyScore,
    modificationRatio: computeModificationRatio(resumeText, keywordChanges),
  };
}

export const ATS_OPTIMIZE_CONFIRM_EXAMPLES: AtsKeywordChange[] = [
  { before: "Helped", after: "Led" },
  { before: "Made", after: "Built" },
  { before: "Worked on", after: "Delivered" },
  { before: "Used", after: "Applied" },
];
