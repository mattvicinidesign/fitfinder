/** ATS keyword optimization — extremely conservative in-place edits only. */

export interface AtsKeywordChange {
  before: string;
  after: string;
  /** abs(replacementWidth - originalWidth) / originalWidth for this swap. */
  visualWidthDeltaPercent?: number;
}

export type AtsSafetyScore = "low" | "medium" | "high";

export const ATS_MAX_TEXT_MODIFICATION_RATIO = 0.05;
export const ATS_MAX_KEYWORD_SWAPS = 15;
export const ATS_PREVIEW_KEYWORD_CHANGE_COUNT = ATS_MAX_KEYWORD_SWAPS;
export const ATS_MAX_KEYWORD_OCCURRENCES = 3;
export const MAX_REPLACEMENT_LENGTH_RATIO = 1.25;
export const MAX_BULLET_LENGTH_DELTA_RATIO = 0.1;
export const MAX_BULLET_LENGTH_DELTA_ABS = 8;
export const MIN_UNCHANGED_BULLET_RATIO = 0.85;
export const LAYOUT_PRESERVATION_MIN_SCORE = 95;
export const DISCOVERY_MAX_VISUAL_WIDTH_DELTA_RATIO = 0.2;
export const REVIEW_MAX_VISUAL_WIDTH_DELTA_RATIO = 0.1;
export const EXPORT_MAX_VISUAL_WIDTH_DELTA_RATIO = 0.05;
/** @deprecated Use EXPORT_MAX_VISUAL_WIDTH_DELTA_RATIO */
export const MAX_VISUAL_WIDTH_DELTA_RATIO = EXPORT_MAX_VISUAL_WIDTH_DELTA_RATIO;
export const REVIEW_MAX_REPLACEMENT_LENGTH_RATIO = 2;
export const REVIEW_MIN_UNCHANGED_BULLET_RATIO = 0.65;
export const REVIEW_MAX_BULLET_LENGTH_DELTA_RATIO = 0.25;
export const TYPOGRAPHY_PRESERVATION_MIN_SCORE = 95;

export const ATS_OPTIMIZATION_POLICY = `
ATS optimization is keyword-only surgery, not resume rewriting.

The optimized resume must be visually, structurally, and semantically identical to the original.
A hiring manager should not be able to tell the resume was rewritten.

Preserve 100% of companies, job titles, dates, metrics, project names, education,
certifications, contact information, section order, bullet count, line count, and structure.

Only targeted keyword substitutions within existing bullet points.
Maximum 5% document modification and 15 keyword swaps total.
`.trim();

/** Weak verbs — discovery generates candidates; validation decides what survives. */
export const WEAK_VERB_REPLACEMENT_POOL: AtsKeywordChange[] = [
  { before: "Helped", after: "Led" },
  { before: "Helped", after: "Supported" },
  { before: "Helped to", after: "Led" },
  { before: "Helped with", after: "Supported" },
  { before: "Helped create", after: "Designed" },
  { before: "Helped Create", after: "Designed" },
  { before: "Helped build", after: "Built" },
  { before: "Helped Build", after: "Built" },
  { before: "Helped develop", after: "Developed" },
  { before: "Helped Develop", after: "Developed" },
  { before: "Helped design", after: "Designed" },
  { before: "Helped Design", after: "Designed" },
  { before: "Made", after: "Built" },
  { before: "Made", after: "Implemented" },
  { before: "Made updates", after: "Implemented updates" },
  { before: "Made Updates", after: "Implemented updates" },
  { before: "Made changes", after: "Implemented changes" },
  { before: "Made Changes", after: "Implemented changes" },
  { before: "Worked on", after: "Delivered" },
  { before: "Worked on", after: "Collaborated on" },
  { before: "Worked on", after: "Developed" },
  { before: "Worked On", after: "Delivered" },
  { before: "Worked On", after: "Collaborated on" },
  { before: "Worked On", after: "Developed" },
  { before: "Worked with", after: "Partnered with" },
  { before: "Worked with", after: "Collaborated with" },
  { before: "Worked With", after: "Partnered with" },
  { before: "Worked With", after: "Collaborated with" },
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
  { before: "Responsible for", after: "Owned" },
  { before: "Responsible For", after: "Managed" },
  { before: "Responsible For", after: "Owned" },
  { before: "Assisted", after: "Supported" },
  { before: "Assisted with", after: "Supported" },
  { before: "Assisted With", after: "Supported" },
  { before: "Participated in", after: "Contributed to" },
  { before: "Participated In", after: "Contributed to" },
  { before: "Supported ongoing", after: "Delivered ongoing" },
  { before: "Supported Ongoing", after: "Delivered ongoing" },
  { before: "Involved in", after: "Contributed to" },
  { before: "Involved In", after: "Contributed to" },
  { before: "In charge of", after: "Led" },
  { before: "In Charge Of", after: "Led" },
  { before: "A variety of", after: "Multiple" },
  { before: "A Variety Of", after: "Multiple" },
];

/** Product design vocabulary — candidates only. */
export const PRODUCT_DESIGN_REPLACEMENT_POOL: AtsKeywordChange[] = [
  { before: "screens", after: "user interfaces" },
  { before: "Screens", after: "user interfaces" },
  { before: "navigation", after: "user navigation flows" },
  { before: "Navigation", after: "user navigation flows" },
  { before: "software platform", after: "SaaS platform" },
  { before: "Software platform", after: "SaaS platform" },
  { before: "software platforms", after: "SaaS platforms" },
  { before: "Software platforms", after: "SaaS platforms" },
  { before: "customer feedback", after: "user feedback" },
  { before: "Customer feedback", after: "user feedback" },
  { before: "Customer Feedback", after: "User feedback" },
  { before: "feedback", after: "user feedback" },
  { before: "Feedback", after: "user feedback" },
  { before: "prototype", after: "interactive prototype" },
  { before: "Prototype", after: "interactive prototype" },
  { before: "prototypes", after: "interactive prototypes" },
  { before: "Prototypes", after: "interactive prototypes" },
  { before: "designs", after: "product designs" },
  { before: "Designs", after: "product designs" },
  { before: "testing", after: "usability testing" },
  { before: "Testing", after: "usability testing" },
  { before: "research", after: "user research" },
  { before: "Research", after: "user research" },
  { before: "team members", after: "cross-functional stakeholders" },
  { before: "Team members", after: "cross-functional stakeholders" },
  { before: "Team Members", after: "cross-functional stakeholders" },
  { before: "wireframes", after: "wireframe designs" },
  { before: "Wireframes", after: "wireframe designs" },
  { before: "web applications", after: "SaaS applications" },
  { before: "Web applications", after: "SaaS applications" },
  { before: "web application", after: "SaaS platform" },
  { before: "Web application", after: "SaaS platform" },
  { before: "developers", after: "engineering teams" },
  { before: "Developers", after: "engineering teams" },
];

type ContextAwareRule = {
  trigger: RegExp;
  mappings: AtsKeywordChange[];
};

const CONTEXT_AWARE_RULES: ContextAwareRule[] = [
  {
    trigger: /\bfigma\b/i,
    mappings: [
      { before: "designs", after: "UI designs" },
      { before: "Designs", after: "UI designs" },
      { before: "screens", after: "UI screens" },
      { before: "Screens", after: "UI screens" },
      { before: "wireframes", after: "wireframing" },
      { before: "Wireframes", after: "wireframing" },
      { before: "prototype", after: "interactive prototype" },
      { before: "Prototype", after: "interactive prototype" },
    ],
  },
  {
    trigger: /\bcustomer feedback\b/i,
    mappings: [
      { before: "customer feedback", after: "user feedback" },
      { before: "Customer feedback", after: "user feedback" },
      { before: "feedback", after: "user feedback" },
      { before: "Feedback", after: "user feedback" },
    ],
  },
  {
    trigger: /\bdevelopers?\b/i,
    mappings: [
      { before: "developers", after: "engineering teams" },
      { before: "Developers", after: "engineering teams" },
      { before: "developer", after: "engineer" },
      { before: "Developer", after: "engineer" },
      { before: "Worked with", after: "Collaborated with" },
      { before: "Worked With", after: "Collaborated with" },
    ],
  },
  {
    trigger: /\bweb applications?\b/i,
    mappings: [
      { before: "web applications", after: "SaaS applications" },
      { before: "Web applications", after: "SaaS applications" },
      { before: "web application", after: "SaaS platform" },
      { before: "Web application", after: "SaaS platform" },
      { before: "software platform", after: "SaaS platform" },
      { before: "Software platform", after: "SaaS platform" },
    ],
  },
];

/** Combined static pool used for structure validation. */
export const KEYWORD_REPLACEMENT_POOL: AtsKeywordChange[] = [
  ...WEAK_VERB_REPLACEMENT_POOL,
  ...PRODUCT_DESIGN_REPLACEMENT_POOL,
];

export type KeywordRejectionReason =
  | "width_tolerance"
  | "typography"
  | "duplicate_keyword_limit"
  | "saturation_limit"
  | "layout_preservation"
  | "length_ratio"
  | "golden_rule"
  | "buzzword";

export type KeywordRejectionCounts = Record<KeywordRejectionReason, number>;

export function createEmptyRejectionCounts(): KeywordRejectionCounts {
  return {
    width_tolerance: 0,
    typography: 0,
    duplicate_keyword_limit: 0,
    saturation_limit: 0,
    layout_preservation: 0,
    length_ratio: 0,
    golden_rule: 0,
    buzzword: 0,
  };
}

export type KeywordDiscoveryResult = {
  keywordOpportunitiesFound: number;
  keywordChanges: AtsKeywordChange[];
  reviewCandidates: number;
  rejectionCounts: KeywordRejectionCounts;
  discoveryRejectionCounts: KeywordRejectionCounts;
  reviewRejectionCounts: KeywordRejectionCounts;
  rejectedCandidates: RejectedKeywordCandidate[];
  diagnostics: AtsKeywordDiagnostics;
};

export type RejectedKeywordCandidate = {
  before: string;
  after: string;
  reason: KeywordRejectionReason;
  stage: "discovery" | "review";
};

export type AtsKeywordDiagnostics = {
  opportunitiesFound: number;
  reviewCandidates: number;
  approvedCandidates: number;
  rejected: KeywordRejectionCounts;
};

function dedupePoolChanges(changes: AtsKeywordChange[]): AtsKeywordChange[] {
  const seen = new Set<string>();
  const unique: AtsKeywordChange[] = [];
  for (const change of changes) {
    const key = `${change.before.toLowerCase()}→${change.after.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(change);
  }
  return unique;
}

export function getContextAwareReplacements(line: string): AtsKeywordChange[] {
  const mappings: AtsKeywordChange[] = [];
  for (const rule of CONTEXT_AWARE_RULES) {
    if (!rule.trigger.test(line)) continue;
    mappings.push(...rule.mappings);
  }
  return dedupePoolChanges(mappings);
}

function buildDiscoveryPoolForLine(line: string): AtsKeywordChange[] {
  return dedupePoolChanges([
    ...WEAK_VERB_REPLACEMENT_POOL,
    ...PRODUCT_DESIGN_REPLACEMENT_POOL,
    ...getContextAwareReplacements(line),
  ]);
}

export function logKeywordDiscoveryStats(result: KeywordDiscoveryResult): void {
  const d = result.diagnostics;
  const review = result.reviewRejectionCounts;
  console.info(
    `[ATS discovery] opportunitiesFound=${d.opportunitiesFound} reviewCandidates=${d.reviewCandidates} | ` +
      `Rejected Width=${review.width_tolerance} GoldenRule=${review.golden_rule} ` +
      `Length=${review.length_ratio} Duplicate=${review.duplicate_keyword_limit} ` +
      `Saturation=${review.saturation_limit} Buzzword=${review.buzzword}`,
  );
  if (result.rejectedCandidates.length > 0) {
    console.info(
      "[ATS discovery] rejected sample:",
      result.rejectedCandidates.slice(0, 12).map(
        (entry) =>
          `${entry.before} → ${entry.after} (${entry.stage}:${entry.reason})`,
      ),
    );
  }
}

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

/** Liberal discovery — scan accomplishment-like lines across the full resume. */
function isDiscoverableLine(line: string): boolean {
  if (isScannableAccomplishmentLine(line)) return true;

  const trimmed = line.trim();
  if (!trimmed || trimmed.length < 10 || trimmed.length > 320) return false;
  if (
    isSectionHeader(line) ||
    isExperienceHeaderLine(line) ||
    isContactLine(line) ||
    isSummaryLikeLine(line)
  ) {
    return false;
  }

  const wordCount = trimmed.split(/\s+/).length;
  return wordCount >= 3 && wordCount <= 50;
}

function getValidationPoolForResume(resumeText: string): AtsKeywordChange[] {
  const pool = [...KEYWORD_REPLACEMENT_POOL];
  for (const line of resumeText.split("\n")) {
    pool.push(...getContextAwareReplacements(line));
  }
  return dedupePoolChanges(pool);
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
  educationEntryCount: number;
  certificationEntryCount: number;
}

function countEntriesInSection(
  text: string,
  sectionNames: string[],
): number {
  const lines = text.split("\n");
  let inSection = false;
  let count = 0;

  for (const line of lines) {
    const normalized = line
      .trim()
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .trim();

    if (sectionNames.includes(normalized)) {
      inSection = true;
      continue;
    }

    if (inSection && isSectionHeader(line)) break;

    const trimmed = line.trim();
    if (
      inSection &&
      trimmed &&
      !isBulletLine(line) &&
      trimmed.length >= 8 &&
      trimmed.length <= 140
    ) {
      count += 1;
    }
  }

  return count;
}

function countEducationEntries(text: string): number {
  return countEntriesInSection(text, ["education", "academic background"]);
}

function countCertificationEntries(text: string): number {
  return countEntriesInSection(text, [
    "certifications",
    "certificates",
    "licenses",
    "licenses and certifications",
  ]);
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
    educationEntryCount: countEducationEntries(text),
    certificationEntryCount: countCertificationEntries(text),
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
    a.dateCount === b.dateCount &&
    a.educationEntryCount === b.educationEntryCount &&
    a.certificationEntryCount === b.certificationEntryCount
  );
}

export interface LayoutPreservationMetadata {
  originalPageCount?: number;
  patchedPageCount?: number;
}

export function computeLayoutPreservationScore(
  originalText: string,
  patchedText: string,
  metadata: LayoutPreservationMetadata = {},
): number {
  const original = extractResumeStructureFingerprint(originalText);
  const patched = extractResumeStructureFingerprint(patchedText);

  let score = 100;

  if (original.lineCount !== patched.lineCount) score -= 25;
  if (original.bulletCount !== patched.bulletCount) score -= 25;
  if (original.sectionCount !== patched.sectionCount) score -= 15;
  if (original.companyLineCount !== patched.companyLineCount) score -= 10;
  if (original.jobTitleLineCount !== patched.jobTitleLineCount) score -= 10;
  if (original.dateCount !== patched.dateCount) score -= 10;
  if (original.educationEntryCount !== patched.educationEntryCount) score -= 10;
  if (original.certificationEntryCount !== patched.certificationEntryCount) {
    score -= 5;
  }

  const charDelta =
    Math.abs(patchedText.length - originalText.length) /
    Math.max(originalText.length, 1);
  if (charDelta > 0.05) score -= 15;
  else if (charDelta > 0.02) score -= 8;
  else if (charDelta > 0.01) score -= 3;

  if (
    metadata.originalPageCount != null &&
    metadata.patchedPageCount != null &&
    metadata.originalPageCount !== metadata.patchedPageCount
  ) {
    score -= 30;
  }

  if (!validateResumeStructurePreserved(originalText, patchedText)) {
    score = Math.min(score, 60);
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function evaluateLayoutPreservation(
  originalText: string,
  patchedText: string,
  metadata: LayoutPreservationMetadata = {},
): { layoutPreservationScore: number; layoutPreserved: boolean } {
  const layoutPreservationScore = computeLayoutPreservationScore(
    originalText,
    patchedText,
    metadata,
  );
  return {
    layoutPreservationScore,
    layoutPreserved: layoutPreservationScore >= LAYOUT_PRESERVATION_MIN_SCORE,
  };
}

export function estimateTextRenderedWidth(text: string, unitCharWidth = 1): number {
  let width = 0;
  for (const ch of text) {
    if (ch === " ") width += 0.28 * unitCharWidth;
    else if ("iltjfI1|.,:;!".includes(ch)) width += 0.42 * unitCharWidth;
    else if ("wWmM@%".includes(ch)) width += 1.1 * unitCharWidth;
    else width += 0.68 * unitCharWidth;
  }
  return width;
}

export function computeVisualWidthDeltaPercent(
  originalWidth: number,
  replacementWidth: number,
): number {
  if (originalWidth <= 0) return 0;
  return Math.abs(replacementWidth - originalWidth) / originalWidth;
}

export function visualWidthDeltaPercentForChange(change: AtsKeywordChange): number {
  if (typeof change.visualWidthDeltaPercent === "number") {
    return change.visualWidthDeltaPercent;
  }
  return computeVisualWidthDeltaPercent(
    estimateTextRenderedWidth(change.before),
    estimateTextRenderedWidth(change.after),
  );
}

export function withVisualWidthDelta(change: AtsKeywordChange): AtsKeywordChange {
  return {
    ...change,
    visualWidthDeltaPercent: visualWidthDeltaPercentForChange(change),
  };
}

export type ValidationStage = "discovery" | "review" | "export";

export function passesStageWidthTolerance(
  change: AtsKeywordChange,
  stage: ValidationStage,
): boolean {
  const limits: Record<ValidationStage, number> = {
    discovery: DISCOVERY_MAX_VISUAL_WIDTH_DELTA_RATIO,
    review: REVIEW_MAX_VISUAL_WIDTH_DELTA_RATIO,
    export: EXPORT_MAX_VISUAL_WIDTH_DELTA_RATIO,
  };
  // Shorter replacements never create visible spacing gaps.
  if (change.after.length <= change.before.length) {
    return true;
  }

  const delta = visualWidthDeltaPercentForChange(change);
  if (delta <= limits[stage]) return true;

  const lengthRatio = change.after.length / Math.max(change.before.length, 1);
  if (stage === "review" && lengthRatio <= REVIEW_MAX_REPLACEMENT_LENGTH_RATIO) {
    return true;
  }
  if (stage === "discovery" && lengthRatio <= 1.75) {
    return true;
  }

  return false;
}

export function passesVisualWidthTolerance(
  change: AtsKeywordChange,
  maxDeltaRatio = EXPORT_MAX_VISUAL_WIDTH_DELTA_RATIO,
): boolean {
  if (maxDeltaRatio !== EXPORT_MAX_VISUAL_WIDTH_DELTA_RATIO) {
    const delta = visualWidthDeltaPercentForChange(change);
    if (change.after.length <= change.before.length) return true;
    return delta <= maxDeltaRatio;
  }
  return passesStageWidthTolerance(change, "export");
}

function lineCharDensity(line: string): number {
  if (!line.length) return 1;
  return line.replace(/\s/g, "").length / line.length;
}

export function detectAbnormalWhitespace(
  originalLine: string,
  modifiedLine: string,
): boolean {
  if (/\s{2,}/.test(modifiedLine) && !/\s{2,}/.test(originalLine)) {
    return true;
  }

  const origGapWidths = (originalLine.match(/\s+/g) ?? []).map((gap) => gap.length);
  const modGapWidths = (modifiedLine.match(/\s+/g) ?? []).map((gap) => gap.length);
  if (modGapWidths.some((width, index) => {
    const origWidth = origGapWidths[index] ?? 1;
    return width >= origWidth * 2 && width >= 2;
  })) {
    return true;
  }

  const densityDelta = Math.abs(
    lineCharDensity(originalLine) - lineCharDensity(modifiedLine),
  );
  return densityDelta > 0.05;
}

export function computeTypographyPreservationScore(
  originalText: string,
  patchedText: string,
  appliedChanges: AtsKeywordChange[],
): number {
  let score = 100;

  if (appliedChanges.length > 0) {
    const avgDelta =
      appliedChanges.reduce(
        (sum, change) => sum + visualWidthDeltaPercentForChange(change),
        0,
      ) / appliedChanges.length;
    if (avgDelta > MAX_VISUAL_WIDTH_DELTA_RATIO) score -= 25;
    else if (avgDelta > 0.03) score -= 12;
    else if (avgDelta > 0.02) score -= 6;
    else if (avgDelta > 0.01) score -= 2;
  }

  const originalLines = originalText.split("\n");
  const patchedLines = patchedText.split("\n");
  for (let i = 0; i < originalLines.length; i += 1) {
    const originalLine = originalLines[i]!;
    const patchedLine = patchedLines[i] ?? originalLine;
    if (originalLine === patchedLine) continue;

    if (detectAbnormalWhitespace(originalLine, patchedLine)) {
      score -= 15;
    }

    const densityDelta = Math.abs(
      lineCharDensity(originalLine) - lineCharDensity(patchedLine),
    );
    if (densityDelta > 0.05) score -= 10;
    else if (densityDelta > 0.02) score -= 4;
  }

  for (const change of appliedChanges) {
    if (!passesVisualWidthTolerance(change)) score -= 20;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function evaluateTypographyPreservation(
  originalText: string,
  patchedText: string,
  appliedChanges: AtsKeywordChange[],
): { typographyPreservationScore: number; typographyPreserved: boolean } {
  const typographyPreservationScore = computeTypographyPreservationScore(
    originalText,
    patchedText,
    appliedChanges,
  );
  return {
    typographyPreservationScore,
    typographyPreserved:
      typographyPreservationScore >= TYPOGRAPHY_PRESERVATION_MIN_SCORE,
  };
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
  maxLengthRatio = MAX_REPLACEMENT_LENGTH_RATIO,
  maxBulletDeltaRatio = MAX_BULLET_LENGTH_DELTA_RATIO,
  minUnchangedRatio = MIN_UNCHANGED_BULLET_RATIO,
): boolean {
  if (originalLine === modifiedLine) return false;
  if (!lineIsSingleKeywordSwap(originalLine, modifiedLine, [change])) return false;

  if (change.after.length > change.before.length * maxLengthRatio) {
    return false;
  }

  const unchangedRatio =
    (originalLine.length - change.before.length) / Math.max(originalLine.length, 1);
  if (unchangedRatio < minUnchangedRatio) return false;

  const lengthDelta = Math.abs(modifiedLine.length - originalLine.length);
  const maxDelta = originalLine.length * maxBulletDeltaRatio;
  if (lengthDelta > maxDelta) return false;

  return true;
}

function passesReviewGoldenRule(
  originalLine: string,
  modifiedLine: string,
  change: AtsKeywordChange,
): boolean {
  return passesGoldenRule(
    originalLine,
    modifiedLine,
    change,
    REVIEW_MAX_REPLACEMENT_LENGTH_RATIO,
    REVIEW_MAX_BULLET_LENGTH_DELTA_RATIO,
    REVIEW_MIN_UNCHANGED_BULLET_RATIO,
  );
}

function nonBulletLinesIdentical(
  original: string,
  modified: string,
  pool: AtsKeywordChange[] = KEYWORD_REPLACEMENT_POOL,
): boolean {
  const originalLines = original.split("\n");
  const modifiedLines = modified.split("\n");
  if (originalLines.length !== modifiedLines.length) return false;

  for (let i = 0; i < originalLines.length; i += 1) {
    if (isBulletLine(originalLines[i]!)) continue;
    if (originalLines[i] === modifiedLines[i]) continue;
    if (lineIsSingleKeywordSwap(originalLines[i]!, modifiedLines[i]!, pool)) {
      continue;
    }
    return false;
  }

  return true;
}

export function validateResumeStructurePreserved(
  original: string,
  modified: string,
): boolean {
  const validationPool = getValidationPoolForResume(original);
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
  if (!nonBulletLinesIdentical(original, modified, validationPool)) return false;

  for (let i = 0; i < originalLines.length; i += 1) {
    if (
      !lineIsSingleKeywordSwap(
        originalLines[i]!,
        modifiedLines[i]!,
        validationPool,
      )
    ) {
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

function validateDiscoveryStage(
  change: AtsKeywordChange,
): { accepted: boolean; reason?: KeywordRejectionReason } {
  const lengthRatio = change.after.length / Math.max(change.before.length, 1);
  if (lengthRatio > 2.5) {
    return { accepted: false, reason: "length_ratio" };
  }

  if (
    change.after.length > change.before.length &&
    !passesStageWidthTolerance(change, "discovery")
  ) {
    return { accepted: false, reason: "width_tolerance" };
  }

  return { accepted: true };
}

function validateReviewStage(
  change: AtsKeywordChange,
  line: string,
  resumeText: string,
  plannedAfterCounts: Map<string, number>,
): { accepted: boolean; reason?: KeywordRejectionReason } {
  const lengthRatio = change.after.length / Math.max(change.before.length, 1);
  if (lengthRatio > REVIEW_MAX_REPLACEMENT_LENGTH_RATIO) {
    return { accepted: false, reason: "length_ratio" };
  }

  if (
    change.after.length > change.before.length &&
    !passesStageWidthTolerance(change, "review")
  ) {
    return { accepted: false, reason: "width_tolerance" };
  }

  if (containsBlockedBuzzwords(change.after, resumeText)) {
    return { accepted: false, reason: "buzzword" };
  }

  const existingAfterCount = countPhraseOccurrences(resumeText, change.after);
  const plannedCount =
    plannedAfterCounts.get(change.after.toLowerCase()) ?? existingAfterCount;
  if (plannedCount >= ATS_MAX_KEYWORD_OCCURRENCES) {
    return { accepted: false, reason: "duplicate_keyword_limit" };
  }

  const modifiedLine = applySingleSwapOnLine(line, change);
  if (!passesReviewGoldenRule(line, modifiedLine, change)) {
    return { accepted: false, reason: "golden_rule" };
  }

  return { accepted: true };
}

function pushRejectedCandidate(
  list: RejectedKeywordCandidate[],
  change: AtsKeywordChange,
  reason: KeywordRejectionReason,
  stage: "discovery" | "review",
) {
  list.push({
    before: change.before,
    after: change.after,
    reason,
    stage,
  });
}

function discoverKeywordOpportunities(resumeText: string): ScannedChange[] {
  const lines = resumeText.split("\n");
  const candidates: ScannedChange[] = [];
  const usedSpans = new Set<string>();

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex]!;
    if (!isDiscoverableLine(line)) continue;

    const discoveryPool = buildDiscoveryPoolForLine(line);
    for (const change of discoveryPool) {
      const pattern = new RegExp(escapeRegExp(change.before), "gi");
      let match: RegExpExecArray | null;

      while ((match = pattern.exec(line)) !== null) {
        const spanKey = `${lineIndex}:${match.index}:${change.before.toLowerCase()}:${change.after.toLowerCase()}`;
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

  return candidates;
}

function pickBestReviewCandidatePerSpan(
  candidates: ScannedChange[],
  lines: string[],
  resumeText: string,
): ScannedChange[] {
  const bySpan = new Map<string, ScannedChange[]>();
  for (const candidate of candidates) {
    const key = `${candidate.lineIndex}:${candidate.matchIndex}`;
    const group = bySpan.get(key) ?? [];
    group.push(candidate);
    bySpan.set(key, group);
  }

  const selected: ScannedChange[] = [];
  for (const group of bySpan.values()) {
    const sorted = [...group].sort(
      (a, b) =>
        visualWidthDeltaPercentForChange(a) -
        visualWidthDeltaPercentForChange(b),
    );

    let picked = sorted[0]!;
    for (const candidate of sorted) {
      const line = lines[candidate.lineIndex]!;
      const validation = validateReviewStage(
        candidate,
        line,
        resumeText,
        new Map<string, number>(),
      );
      if (validation.accepted) {
        picked = candidate;
        break;
      }
    }
    selected.push(picked);
  }

  return selected.sort((a, b) => {
    if (a.lineIndex !== b.lineIndex) return a.lineIndex - b.lineIndex;
    if (a.matchIndex !== b.matchIndex) return a.matchIndex - b.matchIndex;
    return 0;
  });
}

export function scanResumeWithDiscovery(
  resumeText: string,
  maxCount = ATS_MAX_KEYWORD_SWAPS,
): KeywordDiscoveryResult {
  const discovered = discoverKeywordOpportunities(resumeText);
  const discoveryRejectionCounts = createEmptyRejectionCounts();
  const reviewRejectionCounts = createEmptyRejectionCounts();
  const rejectedCandidates: RejectedKeywordCandidate[] = [];
  const lines = resumeText.split("\n");
  const opportunities = pickBestReviewCandidatePerSpan(
    discovered,
    lines,
    resumeText,
  );
  const keywordOpportunitiesFound = opportunities.length;

  const discoveryPassed: ScannedChange[] = [];
  for (const candidate of opportunities) {
    const validation = validateDiscoveryStage(candidate);
    if (!validation.accepted) {
      if (validation.reason) {
        discoveryRejectionCounts[validation.reason] += 1;
        pushRejectedCandidate(
          rejectedCandidates,
          candidate,
          validation.reason,
          "discovery",
        );
      }
      continue;
    }
    discoveryPassed.push(candidate);
  }

  const selected: AtsKeywordChange[] = [];
  const plannedAfterCounts = new Map<string, number>();

  for (const candidate of discoveryPassed) {
    const line = lines[candidate.lineIndex]!;
    const validation = validateReviewStage(
      candidate,
      line,
      resumeText,
      plannedAfterCounts,
    );

    if (!validation.accepted) {
      if (validation.reason) {
        reviewRejectionCounts[validation.reason] += 1;
        pushRejectedCandidate(
          rejectedCandidates,
          candidate,
          validation.reason,
          "review",
        );
      }
      continue;
    }

    if (selected.length >= maxCount) {
      continue;
    }

    selected.push(
      withVisualWidthDelta({
        before: candidate.before,
        after: candidate.after,
      }),
    );

    const afterKey = candidate.after.toLowerCase();
    const existing = countPhraseOccurrences(resumeText, candidate.after);
    plannedAfterCounts.set(
      afterKey,
      (plannedAfterCounts.get(afterKey) ?? existing) + 1,
    );
  }

  const diagnostics: AtsKeywordDiagnostics = {
    opportunitiesFound: keywordOpportunitiesFound,
    reviewCandidates: selected.length,
    approvedCandidates: 0,
    rejected: mergeRejectionCounts(
      discoveryRejectionCounts,
      reviewRejectionCounts,
    ),
  };

  const result: KeywordDiscoveryResult = {
    keywordOpportunitiesFound,
    keywordChanges: selected,
    reviewCandidates: selected.length,
    rejectionCounts: reviewRejectionCounts,
    discoveryRejectionCounts,
    reviewRejectionCounts,
    rejectedCandidates,
    diagnostics,
  };
  logKeywordDiscoveryStats(result);
  return result;
}

function mergeRejectionCounts(
  a: KeywordRejectionCounts,
  b: KeywordRejectionCounts,
): KeywordRejectionCounts {
  const merged = createEmptyRejectionCounts();
  for (const key of Object.keys(merged) as KeywordRejectionReason[]) {
    merged[key] = a[key] + b[key];
  }
  return merged;
}

export function scanResumeForKeywordChanges(
  resumeText: string,
  maxCount = ATS_MAX_KEYWORD_SWAPS,
): AtsKeywordChange[] {
  return scanResumeWithDiscovery(resumeText, maxCount).keywordChanges;
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
  metadata: LayoutPreservationMetadata = {},
): {
  optimizedResumeText: string;
  layoutPreservationScore: number;
  layoutPreserved: boolean;
  typographyPreservationScore: number;
  typographyPreserved: boolean;
  appliedChanges: AtsKeywordChange[];
  applyRejectionCounts: KeywordRejectionCounts;
  reverted: boolean;
} {
  let text = originalText;
  const appliedChanges: AtsKeywordChange[] = [];
  const applyRejectionCounts = createEmptyRejectionCounts();

  for (const index of approvedIndices) {
    const change = changes[index];
    if (!change) continue;
    if (!passesStageWidthTolerance(change, "export")) {
      applyRejectionCounts.width_tolerance += 1;
      continue;
    }

    const occurrence = occurrenceIndexForChange(changes, index);
    const candidateText = applyKeywordChangeAtOccurrence(text, change, occurrence);

    const originalLines = text.split("\n");
    const candidateLines = candidateText.split("\n");
    let rejected = false;
    for (let lineIndex = 0; lineIndex < originalLines.length; lineIndex += 1) {
      const originalLine = originalLines[lineIndex]!;
      const candidateLine = candidateLines[lineIndex] ?? originalLine;
      if (originalLine === candidateLine) continue;
      if (
        !passesReviewGoldenRule(originalLine, candidateLine, change) ||
        detectAbnormalWhitespace(originalLine, candidateLine)
      ) {
        rejected = true;
        break;
      }
    }
    if (rejected) {
      applyRejectionCounts.typography += 1;
      continue;
    }

    text = candidateText;
    appliedChanges.push(withVisualWidthDelta(change));
  }

  const layout = evaluateLayoutPreservation(originalText, text, metadata);
  const typography = evaluateTypographyPreservation(
    originalText,
    text,
    appliedChanges,
  );

  if (!validateResumeStructurePreserved(originalText, text)) {
    applyRejectionCounts.layout_preservation += approvedIndices.length;
    return {
      optimizedResumeText: originalText,
      layoutPreservationScore: 100,
      layoutPreserved: true,
      typographyPreservationScore: 100,
      typographyPreserved: true,
      appliedChanges: [],
      applyRejectionCounts,
      reverted: true,
    };
  }

  return {
    optimizedResumeText: text,
    layoutPreservationScore: layout.layoutPreservationScore,
    layoutPreserved: layout.layoutPreserved,
    typographyPreservationScore: typography.typographyPreservationScore,
    typographyPreserved: typography.typographyPreserved,
    appliedChanges,
    applyRejectionCounts,
    reverted: false,
  };
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
  const discovery = scanResumeWithDiscovery(resumeText);
  const keywordChanges = discovery.keywordChanges;
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
    keywordOpportunitiesFound: discovery.keywordOpportunitiesFound,
    reviewCandidates: discovery.reviewCandidates,
    discoveryRejectionCounts: discovery.discoveryRejectionCounts,
    reviewRejectionCounts: discovery.reviewRejectionCounts,
    rejectedCandidates: discovery.rejectedCandidates,
    atsDiagnostics: discovery.diagnostics,
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
