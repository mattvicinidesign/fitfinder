import type { AtsKeywordChange, AtsKeywordChangeDecision, AtsKeywordOptimization } from "@/lib/types";
import {
  applyKeywordChangeAtOccurrence,
  occurrenceIndexForChange,
} from "@/lib/ats-keyword-change-snippets";

const CACHE_PREFIX = "fitfinder:resume-review:ats-optimization:";

export const ATS_PREVIEW_KEYWORD_CHANGE_COUNT = 32;

export const ATS_OPTIMIZE_LOADING_STEPS = [
  "Analyzing Resume",
  "Identifying Weak Keywords",
  "Applying ATS Enhancements",
  "Preparing Preview",
] as const;

const KEYWORD_REPLACEMENT_POOL: AtsKeywordChange[] = [
  { before: "Worked With", after: "Collaborated With" },
  { before: "Made", after: "Developed" },
  { before: "Helped", after: "Led" },
  { before: "Helped", after: "Supported" },
  { before: "Responsible For", after: "Managed" },
  { before: "Created", after: "Designed" },
  { before: "Built", after: "Developed" },
  { before: "Did", after: "Executed" },
  { before: "Worked On", after: "Delivered" },
  { before: "Handled", after: "Oversaw" },
  { before: "Used", after: "Leveraged" },
  { before: "Fixed", after: "Resolved" },
  { before: "Changed", after: "Optimized" },
  { before: "Looked At", after: "Analyzed" },
  { before: "Talked To", after: "Partnered With" },
  { before: "Set Up", after: "Implemented" },
  { before: "Ran", after: "Led" },
  { before: "Tried To", after: "Drove" },
  { before: "Good At", after: "Proficient In" },
  { before: "Know", after: "Expert In" },
  { before: "Lots Of", after: "Extensive" },
  { before: "Many", after: "Multiple" },
  { before: "Stuff", after: "Initiatives" },
  { before: "Things", after: "Deliverables" },
  { before: "Started", after: "Initiated" },
  { before: "Finished", after: "Completed" },
  { before: "Got", after: "Achieved" },
  { before: "Wrote", after: "Authored" },
  { before: "Showed", after: "Presented" },
  { before: "Met With", after: "Consulted With" },
  { before: "Figured Out", after: "Determined" },
  { before: "Worked In", after: "Operated Within" },
  { before: "Put Together", after: "Assembled" },
  { before: "Came Up With", after: "Conceptualized" },
  { before: "Dealt With", after: "Addressed" },
  { before: "Worked Closely", after: "Partnered Closely" },
  { before: "In Charge Of", after: "Accountable For" },
  { before: "Big", after: "Large-Scale" },
  { before: "Small", after: "Focused" },
];

const DEFAULT_RESUME_TEXT = `SUMMARY
Experienced product designer who worked with cross-functional teams to deliver user-centered solutions. Responsible for lots of initiatives and helped improve core product metrics.

EXPERIENCE
Senior Product Designer | Acme Corp
- Made design systems and helped improve onboarding conversion.
- Responsible for end-to-end product flows and user research.
- Worked on mobile and web experiences with engineering partners.
- Created prototypes and built reusable UI patterns.
- Handled stakeholder reviews and talked to leadership about roadmap priorities.
- Used analytics tools to look at funnel drop-off and fixed usability issues.
- Set up design critiques and ran weekly syncs with PM and engineering.
- Started a component audit and finished documentation for the design system.
- Got buy-in for a new navigation model and wrote specs for implementation.
- Showed work in exec reviews and met with research to validate concepts.
- Put together onboarding flows and came up with test plans for experiments.
- Dealt with legacy constraints while working in a fast-moving SaaS environment.
- Worked closely with brand on marketing pages and things like landing templates.
- In charge of accessibility reviews and many small UI polish passes.
- Built dashboards for big customer accounts and small self-serve trials.

SKILLS
Figma, user research, prototyping, design systems, collaboration, stuff, things.`;

function normalizeAtsKeywordOptimization(
  raw: unknown,
): AtsKeywordOptimization | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  if (typeof record.originalATSScore !== "number") return null;

  const legacyCompleted = record.optimizationCompleted === true;
  const scanCompleted =
    record.scanCompleted === true || legacyCompleted;
  const optimizationApplied =
    record.optimizationApplied === true || legacyCompleted;

  if (!scanCompleted) return null;

  return {
    originalATSScore: record.originalATSScore as number,
    optimizedATSScore: record.optimizedATSScore as number,
    improvementPercentage: record.improvementPercentage as number,
    scanCompleted: true,
    optimizationApplied,
    optimizedResumeText: String(record.optimizedResumeText ?? ""),
    originalResumeText: String(record.originalResumeText ?? ""),
    keywordChanges: Array.isArray(record.keywordChanges)
      ? (record.keywordChanges as AtsKeywordChange[])
      : [],
    keywordChangeDecisions: Array.isArray(record.keywordChangeDecisions)
      ? (record.keywordChangeDecisions as AtsKeywordChangeDecision[])
      : undefined,
    completedAt: String(record.completedAt ?? new Date().toISOString()),
    improvementDismissed: record.improvementDismissed === true,
  };
}

export function isAtsOptimizationApplied(
  optimization: AtsKeywordOptimization | null | undefined,
): boolean {
  return optimization?.optimizationApplied === true;
}

export function isAtsScanPendingReview(
  optimization: AtsKeywordOptimization | null | undefined,
): boolean {
  return (
    optimization?.scanCompleted === true &&
    optimization.optimizationApplied !== true
  );
}

function cacheKey(reviewId: string) {
  return `${CACHE_PREFIX}${reviewId}`;
}

export function loadAtsKeywordOptimization(
  reviewId: string | null | undefined,
): AtsKeywordOptimization | null {
  if (!reviewId || typeof sessionStorage === "undefined") return null;
  const raw = sessionStorage.getItem(cacheKey(reviewId));
  if (!raw) return null;
  try {
    return normalizeAtsKeywordOptimization(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveAtsKeywordOptimization(
  reviewId: string,
  optimization: AtsKeywordOptimization,
): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(cacheKey(reviewId), JSON.stringify(optimization));
}

export function clearAtsKeywordOptimization(reviewId: string | null | undefined) {
  if (!reviewId || typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(cacheKey(reviewId));
}

export function clearAllAtsKeywordOptimizations(): void {
  if (typeof sessionStorage === "undefined") return;
  for (let i = sessionStorage.length - 1; i >= 0; i -= 1) {
    const key = sessionStorage.key(i);
    if (key?.startsWith(CACHE_PREFIX)) {
      sessionStorage.removeItem(key);
    }
  }
}

function applyKeywordReplacements(
  text: string,
  changes: AtsKeywordChange[],
): string {
  let out = text;
  for (const change of changes) {
    const pattern = new RegExp(change.before.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    out = out.replace(pattern, change.after);
  }
  return out;
}

function pickKeywordChanges(count = 24): AtsKeywordChange[] {
  return KEYWORD_REPLACEMENT_POOL.slice(0, count);
}

function computeOptimizedScore(originalScore: number): number {
  const boost = Math.max(12, Math.min(20, Math.round((100 - originalScore) * 0.22)));
  return Math.min(100, originalScore + boost);
}

export function createPendingKeywordChangeDecisions(
  count = ATS_PREVIEW_KEYWORD_CHANGE_COUNT,
): AtsKeywordChangeDecision[] {
  return Array.from({ length: count }, () => "pending");
}

export function buildResumeWithApprovedChanges(
  optimization: AtsKeywordOptimization,
  decisions: AtsKeywordChangeDecision[],
): {
  optimizedResumeText: string;
  optimizedATSScore: number;
  improvementPercentage: number;
  approvedChanges: AtsKeywordChange[];
} {
  const previewChanges = optimization.keywordChanges.slice(
    0,
    ATS_PREVIEW_KEYWORD_CHANGE_COUNT,
  );
  const approvedChanges: AtsKeywordChange[] = [];
  let text = optimization.originalResumeText;

  previewChanges.forEach((change, index) => {
    if (decisions[index] !== "approved") return;
    const occurrence = occurrenceIndexForChange(previewChanges, index);
    text = applyKeywordChangeAtOccurrence(text, change, occurrence);
    approvedChanges.push(change);
  });

  const approvedCount = previewChanges.filter(
    (_, index) => decisions[index] === "approved",
  ).length;
  const fullBoost = optimization.optimizedATSScore - optimization.originalATSScore;
  const improvementPercentage =
    previewChanges.length > 0
      ? Math.round(fullBoost * (approvedCount / previewChanges.length))
      : 0;
  const optimizedATSScore = Math.min(
    100,
    optimization.originalATSScore + improvementPercentage,
  );

  return {
    optimizedResumeText: text,
    optimizedATSScore,
    improvementPercentage,
    approvedChanges,
  };
}

export function allKeywordChangesReviewed(
  decisions: AtsKeywordChangeDecision[],
  count = ATS_PREVIEW_KEYWORD_CHANGE_COUNT,
): boolean {
  return decisions.slice(0, count).every((decision) => decision !== "pending");
}

export function hasApprovedKeywordChanges(
  decisions: AtsKeywordChangeDecision[],
): boolean {
  return decisions.some((decision) => decision === "approved");
}

export function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export async function simulateAtsKeywordOptimization(input: {
  originalATSScore: number;
  resumeText?: string | null;
  onStep?: (stepIndex: number) => void;
}): Promise<AtsKeywordOptimization> {
  const originalResumeText =
    input.resumeText?.trim() || DEFAULT_RESUME_TEXT;
  const keywordChanges = pickKeywordChanges(KEYWORD_REPLACEMENT_POOL.length);
  const optimizedATSScore = computeOptimizedScore(input.originalATSScore);
  const improvementPercentage = optimizedATSScore - input.originalATSScore;

  for (let i = 0; i < ATS_OPTIMIZE_LOADING_STEPS.length; i += 1) {
    input.onStep?.(i);
    await sleep(900);
  }

  const optimizedResumeText = applyKeywordReplacements(
    originalResumeText,
    keywordChanges,
  );

  return {
    originalATSScore: input.originalATSScore,
    optimizedATSScore,
    improvementPercentage,
    scanCompleted: true,
    optimizationApplied: false,
    optimizedResumeText,
    originalResumeText,
    keywordChanges,
    keywordChangeDecisions: createPendingKeywordChangeDecisions(
      Math.min(keywordChanges.length, ATS_PREVIEW_KEYWORD_CHANGE_COUNT),
    ),
    completedAt: new Date().toISOString(),
    improvementDismissed: false,
  };
}

export function applyAtsKeywordOptimization(
  reviewId: string,
  optimization: AtsKeywordOptimization,
  decisions: AtsKeywordChangeDecision[],
): AtsKeywordOptimization {
  const built = buildResumeWithApprovedChanges(optimization, decisions);
  const next: AtsKeywordOptimization = {
    ...optimization,
    optimizedResumeText: built.optimizedResumeText,
    optimizedATSScore: built.optimizedATSScore,
    improvementPercentage: built.improvementPercentage,
    keywordChangeDecisions: decisions.slice(0, ATS_PREVIEW_KEYWORD_CHANGE_COUNT),
    optimizationApplied: true,
    completedAt: new Date().toISOString(),
  };
  saveAtsKeywordOptimization(reviewId, next);
  return next;
}

export { downloadOptimizedResume } from "@/lib/optimized-resume-download";

export function dismissAtsImprovementBadge(
  reviewId: string,
  optimization: AtsKeywordOptimization,
): AtsKeywordOptimization {
  const next = { ...optimization, improvementDismissed: true };
  saveAtsKeywordOptimization(reviewId, next);
  return next;
}

export const ATS_OPTIMIZE_CONFIRM_EXAMPLES: AtsKeywordChange[] = [
  { before: "Worked With", after: "Collaborated With" },
  { before: "Made", after: "Developed" },
  { before: "Helped", after: "Led / Supported" },
  { before: "Responsible For", after: "Managed" },
];
