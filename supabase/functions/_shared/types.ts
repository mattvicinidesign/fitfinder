// Shared domain types for the Fit Finder scoring + AI service.
//
// These types are the contract between the Edge Functions and both clients
// (iOS + web). The TypeScript client models mirror these shapes.

/** Structured resume extracted by the AI parser. */
export interface ParsedResume {
  skills: string[];
  industries: string[];
  workHistory: WorkHistoryItem[];
  aiExperience: string[];
  tools: string[];
  archetypes: string[];
  /** B2B SaaS, Enterprise Software, Marketplace, etc. */
  softwareModels?: string[];
  country?: string | null;
  timezone?: string | null;
  desiredCompensation?: Compensation | null;
  /** Primary role archetype, e.g. "Product Designer". */
  roleTitle?: string | null;
}

export interface WorkHistoryItem {
  title: string;
  company: string;
  startDate: string | null;
  endDate: string | null; // null === current
  summary: string | null;
}

/** Non-scored fields extracted from the posting (display only). */
export interface JobPostingDetails {
  datePosted?: string | null;
  /** e.g. "United States only", "Worldwide" */
  hireArea?: string | null;
  clientRating?: string | null;
  clientOrigin?: string | null;
  clientCity?: string | null;
  clientAverageHourlyRate?: string | null;
  hoursNeeded?: string | null;
  /** Human-readable project length, e.g. "3 to 6 months" */
  duration?: string | null;
}

/** Structured job posting extracted by the AI parser. */
export interface ParsedJob {
  skills: string[];
  industries: string[];
  workflows: string[];
  compensation: Compensation | null;
  toolRequirements: string[];
  /** Tools mentioned only or primarily in bonus / nice-to-have sections (informational). */
  bonusToolRequirements?: string[];
  aiRequirements: string[];
  softwareModels?: string[];
  countryRequirement?: string | null;
  timezoneRequirement?: string | null;
  /** Role title from posting, e.g. "Senior Product Designer". */
  roleTitle?: string | null;
  /** AI maturity required: 0 | 25 | 50 | 75 | 100. Omit when AI not mentioned. */
  aiMaturityLevel?: number | null;
  /** Who is hiring — informational only, not used in scoring. */
  employerType?: "agency" | "product_company" | "unknown";
  /** Who they want to hire — informational only, not used in scoring. */
  hireTarget?: "freelancer" | "agency" | "direct_hire" | "unknown";
  /** One sentence explaining agency/freelancer detection. */
  postingContextDetail?: string | null;
  engagementDuration?: "ongoing" | "short_term" | "unknown";
  engagementPath?: "contract_to_hire" | "contract" | "direct_hire" | "unknown";
  payStructure?: "hourly" | "fixed_price" | "salary" | "unknown";
  /** Informational metadata — not used in scoring. */
  postingDetails?: JobPostingDetails;
}

export interface Compensation {
  min: number | null;
  max: number | null;
  currency: string | null;
  period: "year" | "month" | "hour" | null;
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

export interface CategoryScore {
  category: CategoryKey;
  label: string;
  status: MatchStatus;
  /** Dimension score 0–100 when known; 0 when unknown. */
  score: number;
  /** Weight percent for this category in the active scoring mode. */
  weight: number;
  /** weight × (score / 100) when known; 0 when unknown. */
  contribution: number;
  /** Coverage categories (skills, workflow): matched count (informational). */
  matchedCount?: number;
  /** Coverage categories: required items in the posting (informational). */
  totalCount?: number;
}

export type Recommendation =
  | "strong_apply"
  | "apply"
  | "stretch"
  | "not_recommended";

/** Output of the V1 Qualification Engine. All scores are 0–100 unless noted. */
export interface ScoreResult {
  qualificationScore: number;
  confidenceScore: number;
  /** Signed adjustment applied after qualification; roughly -25..+15. */
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

/** Narrative analysis produced by the AI layer on top of the scores. */
export interface Narrative {
  strengths: string[];
  gaps: string[];
  recommendations: string[];
  positiveSignals: string[];
  negativeSignals: string[];
}

/** Who is hiring and who they want — display only, not used in scoring. */
export interface PostingContext {
  employerType: "agency" | "product_company" | "unknown";
  hireTarget: "freelancer" | "agency" | "direct_hire" | "unknown";
  label: string;
  detail: string | null;
  engagementDuration: "ongoing" | "short_term" | "unknown";
  engagementPath: "contract_to_hire" | "contract" | "direct_hire" | "unknown";
  payStructure: "hourly" | "fixed_price" | "salary" | "unknown";
  badges: string[];
}

/** Full analysis payload returned by POST /analyze. */
export interface AnalysisResult {
  companyName: string | null;
  jobTitle: string | null;
  parsedJob: ParsedJob;
  /** Resume used for scoring (for UI skills fraction, etc.). */
  parsedResume: ParsedResume;
  /** Pasted job description (bonus tool badges in UI). */
  jobDescription?: string | null;
  score: ScoreResult;
  narrative: Narrative;
  postingContext: PostingContext;
}
