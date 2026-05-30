import { isToolListedInBonus } from "@/lib/bonus-tools";
import { skillsMatchPoolForScoring } from "@/lib/qualified-skills";
import { resumeToolsMatchPool } from "@/lib/resume-tools";
import type { CoverageMatchDetail, ParsedJob, ParsedResume } from "@/lib/types";

export interface CoverageResult {
  matched: number;
  total: number;
  items: CoverageMatchDetail[];
}

function normalize(token: string): string {
  return token
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueRequired(items: string[]): { label: string; norm: string }[] {
  const seen = new Set<string>();
  const out: { label: string; norm: string }[] = [];
  for (const raw of items) {
    const label = raw.trim();
    const norm = normalize(label);
    if (!norm || seen.has(norm)) continue;
    seen.add(norm);
    out.push({ label, norm });
  }
  return out;
}

function findTokenMatch(reqNorm: string, tokens: string[]): string | null {
  for (const raw of tokens) {
    const norm = normalize(raw);
    if (!norm) continue;
    if (norm === reqNorm || norm.includes(reqNorm) || reqNorm.includes(norm)) {
      return raw.trim();
    }
  }
  return null;
}

/** Same token pool as supabase scoring.ts collectResumeWorkflowTokens. */
export function collectResumeWorkflowTokens(resume: ParsedResume): string[] {
  const tokens: string[] = [
    ...resume.archetypes,
    ...resume.skills,
    ...resume.tools,
  ];
  for (const job of resume.workHistory) {
    tokens.push(job.title);
    if (job.summary) tokens.push(job.summary);
  }
  return tokens;
}

function coverageDetailFromRequired(
  required: string[],
  candidateTokens: string[],
): CoverageResult {
  const reqs = uniqueRequired(required);
  if (reqs.length === 0) {
    return { matched: 0, total: 0, items: [] };
  }

  const items: CoverageMatchDetail[] = reqs.map(({ label, norm }) => {
    const resumeMatch = findTokenMatch(norm, candidateTokens);
    return {
      label,
      matched: resumeMatch !== null,
      resumeMatch,
    };
  });

  const matched = items.filter((i) => i.matched).length;
  return { matched, total: items.length, items };
}

export function skillsCoverageDetail(
  job: ParsedJob,
  resume?: ParsedResume | null,
): CoverageResult {
  const matchPool = skillsMatchPoolForScoring(resume?.skills, null);
  return coverageDetailFromRequired(job.skills ?? [], matchPool);
}

export function workflowCoverageDetail(
  job: ParsedJob,
  resume?: ParsedResume | null,
): CoverageResult {
  if (!resume) {
    return coverageDetailFromRequired(job.workflows ?? [], []);
  }
  return coverageDetailFromRequired(
    job.workflows ?? [],
    collectResumeWorkflowTokens(resume),
  );
}

export function toolsCoverageDetail(
  job: ParsedJob,
  resume?: ParsedResume | null,
  jobDescription?: string | null,
): CoverageResult {
  const base = coverageDetailFromRequired(
    job.toolRequirements ?? [],
    resumeToolsMatchPool(resume),
  );

  return {
    ...base,
    items: base.items.map((item) => ({
      ...item,
      listedInBonus: isToolListedInBonus(item.label, job, jobDescription),
    })),
  };
}

export type CoverageCategoryKey = "skills" | "workflow" | "tools";

export function coverageDetailForCategory(
  category: CoverageCategoryKey,
  job: ParsedJob,
  resume?: ParsedResume | null,
  jobDescription?: string | null,
): CoverageResult {
  switch (category) {
    case "skills":
      return skillsCoverageDetail(job, resume);
    case "workflow":
      return workflowCoverageDetail(job, resume);
    case "tools":
      return toolsCoverageDetail(job, resume, jobDescription);
  }
}
