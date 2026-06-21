/**
 * Client-side ATS keyword optimization helpers — mirrors
 * `supabase/functions/_shared/ats_keyword_optimization.ts`.
 */

export {
  ATS_MAX_TEXT_MODIFICATION_RATIO,
  ATS_OPTIMIZATION_POLICY,
  ATS_OPTIMIZE_CONFIRM_EXAMPLES,
  ATS_NO_KEYWORDS_MESSAGE,
  ATS_PREVIEW_KEYWORD_CHANGE_COUNT,
  applyKeywordChangeAtOccurrence,
  buildAtsOptimizationScanResult,
  buildOptimizedResumeText,
  classifyAtsSafetyScore,
  computeOptimizedAtsScore,
  formatAtsSafetyScoreLabel,
  isBulletLine,
  isScannableAccomplishmentLine,
  KEYWORD_REPLACEMENT_POOL,
  occurrenceIndexForChange,
  scanResumeForKeywordChanges,
  validateResumeStructurePreserved,
} from "./ats-keyword-optimization-shared";

export type { AtsSafetyScore } from "./ats-keyword-optimization-shared";
