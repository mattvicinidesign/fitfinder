/**
 * Stage 1 — AI extraction from raw resume and job text.
 * Identifies structured information only; no scoring.
 */

import { completeJSON } from "../openai.ts";
import type { StructuredJobExtract, StructuredResumeExtract } from "./types.ts";

const RESUME_EXTRACT_SYSTEM = `You extract structured career information from a resume for ANY profession (design, engineering, nursing, sales, finance, construction, education, etc.).

Return JSON only with this shape:
{
  "jobTitles": string[],
  "seniority": string | null,
  "yearsExperience": number | null,
  "skills": [{ "label": string, "category": SemanticCategoryKey, "evidenceCount": number, "sourcePhrases": string[] }],
  "responsibilities": [{ ...same item shape... }],
  "tools": [{ ... }],
  "technologies": [{ ... }],
  "methodologies": [{ ... }],
  "industries": string[],
  "leadership": [{ ... }],
  "certifications": [{ ... }],
  "education": [{ ... }],
  "softSkills": [{ ... }],
  "accomplishments": string[],
  "quantifiedImpact": string[],
  "workEnvironment": string[]
}

SemanticCategoryKey must be one of:
experience | skillsTools | responsibilities | domainBackground

Category guidance:
- skillsTools: skills, tools, technologies, methodologies, soft skills
- responsibilities: work performed / duties
- domainBackground: industry/domain knowledge, leadership, education, certifications
- experience: use sparingly on items; years/seniority are captured as top-level fields

Rules:
- Extract as much as possible; do not score or judge fit.
- evidenceCount = how many distinct places in the resume support the item (projects, bullets, roles).
- sourcePhrases = short verbatim or near-verbatim phrases from the resume.
- Be profession-agnostic — do not assume product design terminology.
- Infer soft skills from responsibilities and accomplishments, not keyword stuffing.`;

const JOB_EXTRACT_SYSTEM = `You extract structured requirements from a job description for ANY profession.

Return JSON only:
{
  "jobTitle": string | null,
  "seniority": string | null,
  "yearsExperienceRequired": number | null,
  "requiredCompetencies": [{ "label": string, "category": SemanticCategoryKey, "importance": "required", "sourcePhrases": string[] }],
  "preferredCompetencies": [{ ..., "importance": "preferred" }],
  "bonusCompetencies": [{ ..., "importance": "bonus" }],
  "responsibilities": [{ ... }],
  "tools": [{ ... }],
  "technologies": [{ ... }],
  "methodologies": [{ ... }],
  "industries": string[],
  "leadership": [{ ... }],
  "certifications": [{ ... }],
  "education": [{ ... }],
  "softSkills": [{ ... }],
  "workEnvironment": string[]
}

SemanticCategoryKey: experience | skillsTools | responsibilities | domainBackground

Category guidance:
- skillsTools: skills, tools, technologies, methodologies, soft skills
- responsibilities: work performed / duties
- domainBackground: industry/domain knowledge, leadership, education, certifications
- experience: use sparingly on items; years/seniority are captured as top-level fields

Rules:
- Classify each competency importance as required, preferred, or bonus.
- Extract actual responsibilities (work performed), not just titles.
- Do not score or compare to any candidate.
- Be profession-agnostic.`;

function emptyResumeExtract(): StructuredResumeExtract {
  return {
    jobTitles: [],
    seniority: null,
    yearsExperience: null,
    skills: [],
    responsibilities: [],
    tools: [],
    technologies: [],
    methodologies: [],
    industries: [],
    leadership: [],
    certifications: [],
    education: [],
    softSkills: [],
    accomplishments: [],
    quantifiedImpact: [],
    workEnvironment: [],
  };
}

function emptyJobExtract(): StructuredJobExtract {
  return {
    jobTitle: null,
    seniority: null,
    yearsExperienceRequired: null,
    requiredCompetencies: [],
    preferredCompetencies: [],
    bonusCompetencies: [],
    responsibilities: [],
    tools: [],
    technologies: [],
    methodologies: [],
    industries: [],
    leadership: [],
    certifications: [],
    education: [],
    softSkills: [],
    workEnvironment: [],
  };
}

export async function extractResumeStructure(
  resumeText: string,
): Promise<StructuredResumeExtract> {
  const trimmed = resumeText.trim();
  if (!trimmed) return emptyResumeExtract();

  return completeJSON<StructuredResumeExtract>([
    { role: "system", content: RESUME_EXTRACT_SYSTEM },
    {
      role: "user",
      content: `Extract structured resume data from:\n\n${trimmed.slice(0, 80_000)}`,
    },
  ]);
}

export async function extractJobStructure(
  jobText: string,
  jobTitle?: string | null,
): Promise<StructuredJobExtract> {
  const trimmed = jobText.trim();
  if (!trimmed) return emptyJobExtract();

  const titleHint = jobTitle?.trim()
    ? `Known title hint: ${jobTitle.trim()}\n\n`
    : "";

  return completeJSON<StructuredJobExtract>([
    { role: "system", content: JOB_EXTRACT_SYSTEM },
    {
      role: "user",
      content: `${titleHint}Extract structured job requirements from:\n\n${trimmed.slice(0, 80_000)}`,
    },
  ]);
}
