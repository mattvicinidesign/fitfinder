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
  /** Personal portfolio or website URL when listed on the resume. */
  portfolioUrl?: string | null;
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

export type OpportunityCategoryKey =
  | "roleAlignment"
  | "qualificationsMatch"
  | "industryAlignment"
  | "preferenceAlignment"
  | "clientQuality";

export interface OpportunityCategoryScore {
  category: OpportunityCategoryKey;
  label: string;
  /** Category score 0–100. */
  score: number;
  /** Weight percent toward overall fit (e.g. 35). */
  weight: number;
  contribution: number;
  matchedCount?: number;
  totalCount?: number;
  matchedLabels?: string[];
  missingLabels?: string[];
  details?: string[];
}

export interface OpportunityEngineDebug {
  detectedRoleArchetype: string | null;
  roleArchetypeTier: "positive" | "negative" | "neutral" | "unknown";
  detectedIndustries: string[];
  matchedQualifications: string[];
  missingQualifications: string[];
  preferencesApplied: string[];
  preferenceMismatches: string[];
  categoryScores: OpportunityCategoryScore[];
  weightingCalculation: string;
  finalReasoning: string;
  parsedJobMetadata: Record<string, unknown>;
}

export type ImportanceLevel = "required" | "preferred" | "bonus";

export type SemanticCategoryKey =
  | "skillsTools"
  | "experience"
  | "responsibilities"
  | "domainBackground";

export type MatchKind = "exact" | "strong" | "partial" | "weak" | "missing";

export interface CompetencyMatchResult {
  jobCompetencyId: string;
  jobLabel: string;
  resumeCompetencyId: string | null;
  resumeLabel: string | null;
  canonicalLabel: string;
  category: SemanticCategoryKey;
  importance: ImportanceLevel;
  similarityScore: number;
  matchKind: MatchKind;
  evidenceCount: number;
  reasoning: string;
}

export interface SemanticCategoryScore {
  category: SemanticCategoryKey;
  label: string;
  score: number;
  weight: number;
  contribution: number;
  matched: CompetencyMatchResult[];
  partial: CompetencyMatchResult[];
  missing: CompetencyMatchResult[];
  reasoning: string;
}

export interface CanonicalProfile {
  competencies: {
    id: string;
    canonicalLabel: string;
    category: SemanticCategoryKey;
    importance: ImportanceLevel;
    evidenceCount: number;
    sourcePhrases: string[];
  }[];
  seniority: string | null;
  yearsExperience: number | null;
  industries: string[];
  accomplishments: string[];
  quantifiedImpact: string[];
}

export interface SemanticMatchReport {
  overallMatchPercent: number;
  categoryScores: SemanticCategoryScore[];
  matchedCompetencies: CompetencyMatchResult[];
  partialCompetencies: CompetencyMatchResult[];
  missingCompetencies: CompetencyMatchResult[];
  strengths: string[];
  weaknesses: string[];
  scoreReasoning: string;
  resumeCanonical: CanonicalProfile;
  jobCanonical: CanonicalProfile;
}

export const SEMANTIC_CATEGORY_WEIGHTS: Record<SemanticCategoryKey, number> = {
  skillsTools: 40,
  experience: 25,
  responsibilities: 20,
  domainBackground: 15,
};

export const SEMANTIC_CATEGORY_LABELS: Record<SemanticCategoryKey, string> = {
  skillsTools: "Skills & Tools",
  experience: "Experience",
  responsibilities: "Responsibilities",
  domainBackground: "Domain & Background",
};

/** Map legacy 8-category keys (and aliases) onto the simplified 4-category model. */
export function remapSemanticCategoryKey(value: unknown): SemanticCategoryKey {
  switch (value) {
    case "experience":
      return "experience";
    case "responsibilities":
      return "responsibilities";
    case "skillsTools":
    case "competencies":
    case "toolsTechnology":
    case "softSkills":
      return "skillsTools";
    case "domainBackground":
    case "domainKnowledge":
    case "leadership":
    case "educationCertifications":
      return "domainBackground";
    default:
      return "skillsTools";
  }
}

export interface ScoreResult {
  qualificationScore: number;
  confidenceScore: number;
  careerFitAdjustment: number;
  fitScore: number;
  recommendation: Recommendation;
  recommendationLabel: string;
  scoringMode: "guest" | "registered";
  /** Legacy V1 breakdown — empty when opportunityCategories is populated. */
  categoryBreakdown: CategoryScore[];
  /** Opportunity Engine category scores (primary). */
  opportunityCategories?: OpportunityCategoryScore[];
  opportunityDebug?: OpportunityEngineDebug;
  /** Semantic engine explainable report (primary scoring output). */
  semanticMatchReport?: SemanticMatchReport;
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

/**
 * One job requirement mapped to the resume evidence that satisfies it.
 * Mirrors supabase/functions/_shared/types.ts RequirementMatch.
 */
export interface RequirementMatch {
  requirement: string;
  evidence: string[];
  /** 0–100 confidence that the evidence covers the requirement. */
  confidence: number;
}

/** A resume project surfaced in the proposal with job-specific relevance. */
export interface RelevantProject {
  name: string;
  whyRelevant: string;
  keyContributions: string[];
}

/** Structured, scannable proposal sections returned by the AI layer. */
export interface ProposalSections {
  introduction: string;
  portfolioUrl: string | null;
  relevantProjects: RelevantProject[];
  coreExpertise: string[];
  howIWork: string[];
  whatIDeliver: string[];
  closing: string;
}

/** A generated, job-tailored proposal plus its requirement→evidence mapping. */
export interface ProposalGeneration {
  id: string;
  createdAt: string;
  proposalText: string;
  sections?: ProposalSections;
  jobRequirements: string[];
  evidenceMatches: RequirementMatch[];
  reportId: string | null;
}

export type ResumeReviewFindingStatus = "pass" | "warn" | "fail";

export type ResumeReviewCategoryKey =
  | "content"
  | "structure"
  | "ats"
  | "completeness";

export interface ResumeReviewFinding {
  label: string;
  status: ResumeReviewFindingStatus;
}

export interface ResumeReviewCategory {
  key: ResumeReviewCategoryKey;
  label: string;
  score: number;
  explanation: string;
  findings: ResumeReviewFinding[];
}

export interface ResumeReviewImprovement {
  rank: number;
  title: string;
  estimatedMatchImprovementPercent: number;
  detail: string | null;
  categoryKey: ResumeReviewCategoryKey;
}

export interface AtsKeywordChange {
  before: string;
  after: string;
  visualWidthDeltaPercent?: number;
  lineIndex?: number;
  matchIndex?: number;
}

export type AtsKeywordChangeDecision = "pending" | "approved" | "rejected";

export type AtsSafetyScore = "low" | "medium" | "high";

/** ATS keyword optimization result — ATS Compatibility only. */
export interface AtsKeywordOptimization {
  originalATSScore: number;
  optimizedATSScore: number;
  improvementPercentage: number;
  /** Scan finished and preview is available. */
  scanCompleted: boolean;
  /** User confirmed and the optimized resume was applied. */
  optimizationApplied: boolean;
  optimizedResumeText: string;
  originalResumeText: string;
  keywordChanges: AtsKeywordChange[];
  /** Total keyword edits proposed by the scan. */
  totalKeywordEdits?: number;
  /** Impact classification based on edit count (1–5 low, 6–10 medium, 11–15 high). */
  atsSafetyScore?: AtsSafetyScore;
  /** Fraction of document characters targeted by keyword swaps. */
  modificationRatio?: number;
  /** Review decisions for preview changes. */
  keywordChangeDecisions?: AtsKeywordChangeDecision[];
  /** Structural fidelity score after applying approved swaps (≥95 required). */
  layoutPreservationScore?: number;
  /** True when swaps failed validation and the original text was kept. */
  layoutReverted?: boolean;
  /** Typography fidelity score after applying approved swaps (≥95 required). */
  typographyPreservationScore?: number;
  /** True when typography validation failed and the original text was kept. */
  typographyReverted?: boolean;
  /** Substitutions that passed all validation layers. */
  appliedKeywordChanges?: AtsKeywordChange[];
  /** Total raw opportunities discovered before validation. */
  keywordOpportunitiesFound?: number;
  /** Candidates that passed review-stage validation. */
  reviewCandidates?: number;
  /** Rejection counts from the discovery validation phase. */
  discoveryRejectionCounts?: Record<
    | "width_tolerance"
    | "typography"
    | "duplicate_keyword_limit"
    | "saturation_limit"
    | "layout_preservation"
    | "length_ratio"
    | "golden_rule"
    | "buzzword",
    number
  >;
  /** Rejection counts from the review validation phase. */
  reviewRejectionCounts?: Record<
    | "width_tolerance"
    | "typography"
    | "duplicate_keyword_limit"
    | "saturation_limit"
    | "layout_preservation"
    | "length_ratio"
    | "golden_rule"
    | "buzzword",
    number
  >;
  /** Candidates rejected during discovery/review with reasons (debug). */
  rejectedCandidates?: Array<{
    before: string;
    after: string;
    reason:
      | "width_tolerance"
      | "typography"
      | "duplicate_keyword_limit"
      | "saturation_limit"
      | "layout_preservation"
      | "length_ratio"
      | "golden_rule"
      | "buzzword";
    stage: "discovery" | "review";
  }>;
  /** Structured discovery / review / export stats. */
  atsDiagnostics?: {
    opportunitiesFound: number;
    reviewCandidates: number;
    approvedCandidates: number;
    rejected: Record<
      | "width_tolerance"
      | "typography"
      | "duplicate_keyword_limit"
      | "saturation_limit"
      | "layout_preservation"
      | "length_ratio"
      | "golden_rule"
      | "buzzword",
      number
    >;
  };
  /** Rejection counts from the apply phase (after user approval). */
  applyRejectionCounts?: Record<
    | "width_tolerance"
    | "typography"
    | "duplicate_keyword_limit"
    | "saturation_limit"
    | "layout_preservation"
    | "length_ratio"
    | "golden_rule"
    | "buzzword",
    number
  >;
  completedAt: string;
  improvementDismissed: boolean;
}

/** Resume-only health assessment — not a job match score. */
export interface ResumeReviewResult {
  id: string;
  createdAt: string;
  letterGrade: string;
  overallScore: number;
  summary: string;
  categories: ResumeReviewCategory[];
  improvements: ResumeReviewImprovement[];
  resumeId: string | null;
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
  /** Canonical label from the scoring engine (e.g. "Strong Pursuit"). */
  recommendation_label: string | null;
  narrative_json: Narrative | null;
  parsed_job_json: ParsedJob | null;
  job_description?: string | null;
  created_at: string;
}

/** Normalized job card from The Muse API (Home recommended carousel). */
export interface RecommendedJob {
  id: string;
  title: string;
  company: string;
  location: string;
  level: string;
  publishedAt: string;
  applyUrl: string;
  logoUrl: string | null;
}
