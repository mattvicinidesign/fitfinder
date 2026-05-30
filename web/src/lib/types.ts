// Client-side mirror of the backend domain contract.
// Source of truth: supabase/functions/_shared/types.ts. Keep these in sync.

export interface WorkHistoryItem {
  title: string;
  company: string;
  startDate: string | null;
  endDate: string | null;
  summary: string | null;
}

export interface ParsedResume {
  skills: string[];
  industries: string[];
  workHistory: WorkHistoryItem[];
  aiExperience: string[];
  tools: string[];
  archetypes: string[];
}

export interface Compensation {
  min: number | null;
  max: number | null;
  currency: string | null;
  period: "year" | "month" | "hour" | null;
}

export interface ParsedJob {
  skills: string[];
  industries: string[];
  workflows: string[];
  compensation: Compensation | null;
  toolRequirements: string[];
  aiRequirements: string[];
}

export type Recommendation =
  | "strong_apply"
  | "apply"
  | "stretch"
  | "long_shot"
  | "not_recommended";

export interface ScoreBreakdown {
  skillsMatch: number;
  toolsMatch: number;
  aiMatch: number;
  industryAlignment: number;
  signalCoverage: number;
}

export interface ScoreResult {
  qualificationScore: number;
  confidenceScore: number;
  careerFitAdjustment: number;
  fitScore: number;
  recommendation: Recommendation;
  breakdown: ScoreBreakdown;
}

export interface Narrative {
  strengths: string[];
  gaps: string[];
  recommendations: string[];
  positiveSignals: string[];
  negativeSignals: string[];
}

export interface AnalysisResult {
  companyName: string | null;
  jobTitle: string | null;
  parsedJob: ParsedJob;
  score: ScoreResult;
  narrative: Narrative;
}

/** A persisted analyses row, as returned from the database. */
export interface AnalysisRecord {
  id: string;
  company_name: string | null;
  job_title: string | null;
  qualification_score: number | null;
  fit_score: number | null;
  confidence_score: number | null;
  career_fit_adjustment: number | null;
  recommendation: Recommendation | null;
  narrative_json: Narrative | null;
  parsed_job_json: ParsedJob | null;
  created_at: string;
}

export const RECOMMENDATION_LABELS: Record<Recommendation, string> = {
  strong_apply: "Strong apply",
  apply: "Apply",
  stretch: "Stretch",
  long_shot: "Long shot",
  not_recommended: "Not recommended",
};
