/** Profession-agnostic semantic matching — shared types across pipeline stages. */

export type ImportanceLevel = "required" | "preferred" | "bonus";

export type SemanticCategoryKey =
  | "skillsTools"
  | "experience"
  | "responsibilities"
  | "domainBackground";

export interface ExtractedItem {
  label: string;
  category: SemanticCategoryKey;
  importance?: ImportanceLevel;
  /** How many times this appears in the source document. */
  evidenceCount?: number;
  sourcePhrases?: string[];
}

/** Rich structured extraction from a resume (extraction only — no scoring). */
export interface StructuredResumeExtract {
  jobTitles: string[];
  seniority: string | null;
  yearsExperience: number | null;
  skills: ExtractedItem[];
  responsibilities: ExtractedItem[];
  tools: ExtractedItem[];
  technologies: ExtractedItem[];
  methodologies: ExtractedItem[];
  industries: string[];
  leadership: ExtractedItem[];
  certifications: ExtractedItem[];
  education: ExtractedItem[];
  softSkills: ExtractedItem[];
  accomplishments: string[];
  quantifiedImpact: string[];
  workEnvironment: string[];
}

/** Rich structured extraction from a job description (extraction only — no scoring). */
export interface StructuredJobExtract {
  jobTitle: string | null;
  seniority: string | null;
  yearsExperienceRequired: number | null;
  requiredCompetencies: ExtractedItem[];
  preferredCompetencies: ExtractedItem[];
  bonusCompetencies: ExtractedItem[];
  responsibilities: ExtractedItem[];
  tools: ExtractedItem[];
  technologies: ExtractedItem[];
  methodologies: ExtractedItem[];
  industries: string[];
  leadership: ExtractedItem[];
  certifications: ExtractedItem[];
  education: ExtractedItem[];
  softSkills: ExtractedItem[];
  workEnvironment: string[];
}

/** Normalized competency in the shared canonical model. */
export interface CanonicalCompetency {
  id: string;
  canonicalLabel: string;
  category: SemanticCategoryKey;
  importance: ImportanceLevel;
  evidenceCount: number;
  sourcePhrases: string[];
}

export interface CanonicalProfile {
  competencies: CanonicalCompetency[];
  seniority: string | null;
  yearsExperience: number | null;
  industries: string[];
  accomplishments: string[];
  quantifiedImpact: string[];
}

export type MatchKind = "exact" | "strong" | "partial" | "weak" | "missing";

/** Pairwise competency match with explainable similarity. */
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

/** Full explainable output from the semantic engine. */
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
