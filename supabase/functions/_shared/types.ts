// Shared domain types for the Fit Finder scoring + AI service.
//
// These types are the contract between the Edge Functions and both clients
// (iOS + web). The Swift and TypeScript client models mirror these shapes.

/** Structured resume extracted by the AI parser. */
export interface ParsedResume {
  skills: string[];
  industries: string[];
  workHistory: WorkHistoryItem[];
  aiExperience: string[];
  tools: string[];
  archetypes: string[];
}

export interface WorkHistoryItem {
  title: string;
  company: string;
  startDate: string | null;
  endDate: string | null; // null === current
  summary: string | null;
}

/** Structured job posting extracted by the AI parser. */
export interface ParsedJob {
  skills: string[];
  industries: string[];
  workflows: string[];
  compensation: Compensation | null;
  toolRequirements: string[];
  aiRequirements: string[];
}

export interface Compensation {
  min: number | null;
  max: number | null;
  currency: string | null;
  period: "year" | "month" | "hour" | null;
}

/** Output of the scoring engine. All scores are 0–100 unless noted. */
export interface ScoreResult {
  qualificationScore: number;
  confidenceScore: number;
  /** Signed adjustment applied to qualification, roughly -15..+15. */
  careerFitAdjustment: number;
  fitScore: number;
  recommendation: Recommendation;
  /** Per-dimension breakdown, useful for UI and debugging. */
  breakdown: ScoreBreakdown;
}

export interface ScoreBreakdown {
  skillsMatch: number;
  toolsMatch: number;
  aiMatch: number;
  industryAlignment: number;
  /** Number of required signals the resume could be matched against. */
  signalCoverage: number;
}

export type Recommendation =
  | "strong_apply"
  | "apply"
  | "stretch"
  | "long_shot"
  | "not_recommended";

/** Narrative analysis produced by the AI layer on top of the scores. */
export interface Narrative {
  strengths: string[];
  gaps: string[];
  recommendations: string[];
  positiveSignals: string[];
  negativeSignals: string[];
}

/** Full analysis payload returned by POST /analyze. */
export interface AnalysisResult {
  companyName: string | null;
  jobTitle: string | null;
  parsedJob: ParsedJob;
  score: ScoreResult;
  narrative: Narrative;
}
