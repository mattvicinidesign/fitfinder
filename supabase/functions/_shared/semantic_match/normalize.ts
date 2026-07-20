/**
 * Stage 2 — Normalize extracted profiles into a shared canonical competency model.
 * Maps semantically equivalent phrases to profession-agnostic canonical labels.
 */

import { completeJSON } from "../openai.ts";
import type {
  CanonicalCompetency,
  CanonicalProfile,
  ImportanceLevel,
  SemanticCategoryKey,
  StructuredJobExtract,
  StructuredResumeExtract,
} from "./types.ts";
import { remapSemanticCategoryKey } from "./types.ts";

const NORMALIZE_SYSTEM = `You normalize resume and job extractions into a SHARED profession-agnostic canonical competency model.

Do NOT compare resume to job. Only normalize wording into canonical labels.

Examples of semantic equivalence (different phrases → same canonical label):
- "Customer Interviews", "User Interviews", "Discovery Sessions" → "Research"
- "REST APIs", "Backend Services", "API Development" → "Backend Development"
- "Cold Calling", "Prospecting", "Outbound Sales" → "Lead Generation"
- "Medication Administration", "Drug Delivery" → "Medication Management"
- "Wireframes", "Low Fidelity", "Sketches" → "UX Execution"
- "Google Analytics", "Mixpanel", "Amplitude" → "Product Analytics"

Return JSON:
{
  "resume": {
    "competencies": [{
      "id": string,
      "canonicalLabel": string,
      "category": SemanticCategoryKey,
      "importance": "required" | "preferred" | "bonus",
      "evidenceCount": number,
      "sourcePhrases": string[]
    }],
    "seniority": string | null,
    "yearsExperience": number | null,
    "industries": string[],
    "accomplishments": string[],
    "quantifiedImpact": string[]
  },
  "job": { same shape }
}

Rules:
- Merge synonymous items under one canonicalLabel.
- Assign category using ONLY: experience | skillsTools | responsibilities | domainBackground
  (skills/tools/soft skills → skillsTools; leadership/education/domain → domainBackground).
- For resume items, importance is always "required" (evidence-based).
- For job items, preserve required/preferred/bonus from extraction.
- evidenceCount on resume = repeated demonstration across resume (higher = more confidence).
- Do NOT hardcode product-design-only terms.
- ids should be stable slugs like "comp-backend-development".`;

function slugify(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "item";
}

function coerceCanonicalProfile(
  raw: Partial<CanonicalProfile> | undefined,
  fallbackImportance: ImportanceLevel,
): CanonicalProfile {
  const competencies: CanonicalCompetency[] = [];
  const seen = new Set<string>();

  for (const item of raw?.competencies ?? []) {
    const label = item.canonicalLabel?.trim();
    if (!label) continue;
    const id = item.id?.trim() || slugify(label);
    if (seen.has(id)) continue;
    seen.add(id);
    competencies.push({
      id,
      canonicalLabel: label,
      category: remapSemanticCategoryKey(item.category),
      importance: item.importance ?? fallbackImportance,
      evidenceCount: Math.max(1, Number(item.evidenceCount) || 1),
      sourcePhrases: Array.isArray(item.sourcePhrases)
        ? item.sourcePhrases.filter((p) => typeof p === "string")
        : [],
    });
  }

  return {
    competencies,
    seniority: raw?.seniority ?? null,
    yearsExperience:
      typeof raw?.yearsExperience === "number" ? raw.yearsExperience : null,
    industries: Array.isArray(raw?.industries)
      ? raw.industries.filter((i) => typeof i === "string")
      : [],
    accomplishments: Array.isArray(raw?.accomplishments)
      ? raw.accomplishments.filter((a) => typeof a === "string")
      : [],
    quantifiedImpact: Array.isArray(raw?.quantifiedImpact)
      ? raw.quantifiedImpact.filter((a) => typeof a === "string")
      : [],
  };
}

/** Fallback normalization without LLM when API fails — groups by lowercase label. */
export function normalizeProfilesDeterministic(
  resumeExtract: StructuredResumeExtract,
  jobExtract: StructuredJobExtract,
): { resume: CanonicalProfile; job: CanonicalProfile } {
  const resumeItems = [
    ...resumeExtract.skills,
    ...resumeExtract.responsibilities,
    ...resumeExtract.tools,
    ...resumeExtract.technologies,
    ...resumeExtract.methodologies,
    ...resumeExtract.leadership,
    ...resumeExtract.certifications,
    ...resumeExtract.education,
    ...resumeExtract.softSkills,
  ];

  const jobItems = [
    ...jobExtract.requiredCompetencies,
    ...jobExtract.preferredCompetencies,
    ...jobExtract.bonusCompetencies,
    ...jobExtract.responsibilities,
    ...jobExtract.tools,
    ...jobExtract.technologies,
    ...jobExtract.methodologies,
    ...jobExtract.leadership,
    ...jobExtract.certifications,
    ...jobExtract.education,
    ...jobExtract.softSkills,
  ];

  function toCanonical(
    items: typeof resumeItems,
    defaultImportance: ImportanceLevel,
  ): CanonicalCompetency[] {
    const map = new Map<string, CanonicalCompetency>();
    for (const item of items) {
      const label = item.label?.trim();
      if (!label) continue;
      const key = label.toLowerCase();
      const existing = map.get(key);
      const count = Math.max(1, item.evidenceCount ?? 1);
      if (existing) {
        existing.evidenceCount += count;
        existing.sourcePhrases.push(...(item.sourcePhrases ?? [label]));
      } else {
        map.set(key, {
          id: slugify(label),
          canonicalLabel: label,
          category: remapSemanticCategoryKey(item.category),
          importance: item.importance ?? defaultImportance,
          evidenceCount: count,
          sourcePhrases: item.sourcePhrases?.length
            ? [...item.sourcePhrases]
            : [label],
        });
      }
    }
    return [...map.values()];
  }

  return {
    resume: {
      competencies: toCanonical(resumeItems, "required"),
      seniority: resumeExtract.seniority,
      yearsExperience: resumeExtract.yearsExperience,
      industries: resumeExtract.industries,
      accomplishments: resumeExtract.accomplishments,
      quantifiedImpact: resumeExtract.quantifiedImpact,
    },
    job: {
      competencies: toCanonical(jobItems, "required"),
      seniority: jobExtract.seniority,
      yearsExperience: jobExtract.yearsExperienceRequired,
      industries: jobExtract.industries,
      accomplishments: [],
      quantifiedImpact: [],
    },
  };
}

export async function normalizeProfiles(
  resumeExtract: StructuredResumeExtract,
  jobExtract: StructuredJobExtract,
): Promise<{ resume: CanonicalProfile; job: CanonicalProfile }> {
  try {
    const result = await completeJSON<{
      resume?: CanonicalProfile;
      job?: CanonicalProfile;
    }>([
      { role: "system", content: NORMALIZE_SYSTEM },
      {
        role: "user",
        content: JSON.stringify({ resumeExtract, jobExtract }),
      },
    ]);

    return {
      resume: coerceCanonicalProfile(result.resume, "required"),
      job: coerceCanonicalProfile(result.job, "required"),
    };
  } catch {
    return normalizeProfilesDeterministic(resumeExtract, jobExtract);
  }
}
