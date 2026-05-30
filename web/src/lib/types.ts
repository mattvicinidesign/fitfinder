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
  softwareModels?: string[];
  country?: string | null;
  timezone?: string | null;
  desiredCompensation?: Compensation | null;
  roleTitle?: string | null;
}

export interface Compensation {
  min: number | null;
  max: number | null;
  currency: string | null;
  period: "year" | "month" | "hour" | null;
}

/** Non-scored fields extracted from the posting (display only). */
export interface JobPostingDetails {
  datePosted?: string | null;
  hireArea?: string | null;
  clientRating?: string | null;
  clientOrigin?: string | null;
  /** City from About the client (e.g. Corona Del Mar), when Upwork shows local time. */
  clientCity?: string | null;
  clientAverageHourlyRate?: string | null;
  hoursNeeded?: string | null;
  duration?: string | null;
}

export interface ParsedJob {
  skills: string[];
  industries: string[];
  workflows: string[];
  compensation: Compensation | null;
  toolRequirements: string[];
  bonusToolRequirements?: string[];
  aiRequirements: string[];
  softwareModels?: string[];
  countryRequirement?: string | null;
  timezoneRequirement?: string | null;
  roleTitle?: string | null;
  aiMaturityLevel?: number | null;
  employerType?: "agency" | "product_company" | "unknown";
  hireTarget?: "freelancer" | "agency" | "direct_hire" | "unknown";
  postingContextDetail?: string | null;
  /** Informational — ongoing vs short-term engagement. */
  engagementDuration?: "ongoing" | "short_term" | "unknown";
  /** Informational — contract-to-hire vs contract vs direct hire. */
  engagementPath?: "contract_to_hire" | "contract" | "direct_hire" | "unknown";
  /** Informational — hourly vs fixed-price vs salary. */
  payStructure?: "hourly" | "fixed_price" | "salary" | "unknown";
  postingDetails?: JobPostingDetails;
}

export interface PostingContext {
  employerType: "agency" | "product_company" | "unknown";
  hireTarget: "freelancer" | "agency" | "direct_hire" | "unknown";
  label: string;
  detail: string | null;
  engagementDuration: "ongoing" | "short_term" | "unknown";
  engagementPath: "contract_to_hire" | "contract" | "direct_hire" | "unknown";
  payStructure: "hourly" | "fixed_price" | "salary" | "unknown";
  /** Resolved chips for Summary UI (duration, path, pay). */
  badges: string[];
}

export type MatchStatus = "match" | "mismatch" | "unknown";

export type CategoryKey =
  | "skills"
  | "industry"
  | "workflow"
  | "tools"
  | "aiEmphasis"
  | "archetype"
  | "softwareModel"
  | "compensation"
  | "country"
  | "timezone";

export interface CoverageMatchDetail {
  label: string;
  matched: boolean;
  /** Resume text that satisfied the match (skill, tool, title, summary, etc.). */
  resumeMatch?: string | null;
  /** Tool was listed in a bonus / nice-to-have section of the posting. */
  listedInBonus?: boolean;
}

/** @deprecated Use CoverageMatchDetail */
export type SkillMatchDetail = CoverageMatchDetail;

export interface CategoryScore {
  category: CategoryKey;
  label: string;
  status: MatchStatus;
  score: number;
  weight: number;
  contribution: number;
  matchedCount?: number;
  totalCount?: number;
  matchDetail?: CoverageMatchDetail[];
  /** @deprecated Use matchDetail */
  skillsDetail?: CoverageMatchDetail[];
}

export type Recommendation =
  | "strong_apply"
  | "apply"
  | "stretch"
  | "not_recommended";

export interface ScoreResult {
  qualificationScore: number;
  confidenceScore: number;
  careerFitAdjustment: number;
  fitScore: number;
  recommendation: Recommendation;
  recommendationLabel: string;
  scoringMode: "guest" | "registered";
  categoryBreakdown: CategoryScore[];
  unknownCategories: string[];
  explanation: string;
  strengths: string[];
  gaps: string[];
  positiveSignalsFound: string[];
  negativeSignalsFound: string[];
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
  parsedResume?: ParsedResume;
  /** Original pasted JD — used to detect bonus-section tools in the UI. */
  jobDescription?: string | null;
  score: ScoreResult;
  narrative: Narrative;
  postingContext?: PostingContext;
}

export interface AnalysisRecord {
  id: string;
  company_name: string | null;
  job_title: string | null;
  qualification_score: number | null;
  fit_score: number | null;
  confidence_score: number | null;
  career_fit_adjustment: number | null;
  recommendation: Recommendation | null;
  /** Canonical label from the scoring engine (e.g. "Highly Recommended"). */
  recommendation_label: string | null;
  narrative_json: Narrative | null;
  parsed_job_json: ParsedJob | null;
  created_at: string;
}
