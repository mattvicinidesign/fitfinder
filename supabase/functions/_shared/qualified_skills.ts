/** Profile qualified skills — used for Skills scoring only (not shown on resume). */

import type { ParsedResume } from "./types.ts";

export const PROFILE_QUALIFIED_SKILL_LABELS = [
  "Mobile App Design",
  "User-Centered Design",
  "Human-Centered Design",
  "Information Architecture",
  "Heuristic Evaluation",
  "UX & UI",
  "User Experience Design",
  "User Interface Design",
  "Responsive Design",
] as const;

function normalizeSkillToken(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9+#.\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Extra phrases that count as a match for each qualified skill. */
const SKILL_MATCH_ALIASES: Record<string, string[]> = {
  [normalizeSkillToken("Mobile App Design")]: [
    "mobile app",
    "mobile application design",
    "mobile design",
    "mobile ux",
    "mobile ui",
  ],
  [normalizeSkillToken("User-Centered Design")]: [
    "user centered design",
    "ucd",
    "user centred design",
  ],
  [normalizeSkillToken("Human-Centered Design")]: [
    "human centered design",
    "hcd",
    "human centred design",
  ],
  [normalizeSkillToken("Information Architecture")]: [
    "ia",
    "information architect",
    "site architecture",
  ],
  [normalizeSkillToken("Heuristic Evaluation")]: [
    "heuristic analysis",
    "usability evaluation",
    "expert review",
    "heuristics",
  ],
  [normalizeSkillToken("UX & UI")]: [
    "ux",
    "ui",
    "ux ui",
    "ux/ui",
    "ui ux",
    "ux and ui",
    "ux and ui design",
    "ux ui design",
    "ui ux design",
  ],
  [normalizeSkillToken("UX & UI Design")]: [
    "ux and ui",
    "ux ui",
    "ux/ui",
    "ui ux",
    "ux design",
    "ui design",
    "user experience design",
    "user interface design",
    "product design",
    "product designer",
    "ux designer",
    "ui designer",
    "senior product designer",
    "ux ui designer",
  ],
  [normalizeSkillToken("User Experience Design")]: [
    "ux design",
    "user experience",
    "experience design",
    "ux designer",
    "product designer",
    "product design",
    "senior product designer",
    "ux strategist",
    "product ux",
    "ux ui designer",
    "enterprise ux",
    "workflow design",
    "dashboard design",
  ],
  [normalizeSkillToken("User Interface Design")]: [
    "ui design",
    "user interface",
    "interface design",
    "ui designer",
  ],
  [normalizeSkillToken("Responsive Design")]: [
    "responsive web design",
    "responsive layouts",
    "responsive ui",
    "mobile responsive",
  ],
};

function dedupeSkills(skills: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of skills) {
    const label = s.trim();
    const key = normalizeSkillToken(label);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(label);
  }
  return out;
}

function expandSkillMatchPool(skills: string[]): string[] {
  const pool: string[] = [];
  const seen = new Set<string>();

  const add = (raw: string) => {
    const label = raw.trim();
    const key = normalizeSkillToken(label);
    if (!key || seen.has(key)) return;
    seen.add(key);
    pool.push(label);
  };

  for (const skill of skills) {
    add(skill);
    const aliases = SKILL_MATCH_ALIASES[normalizeSkillToken(skill)] ?? [];
    for (const alias of aliases) add(alias);
  }

  return pool;
}

function skillAliasGroupForToken(norm: string): string[] | null {
  for (const [canonical, aliases] of Object.entries(SKILL_MATCH_ALIASES)) {
    const group = [canonical, ...aliases.map(normalizeSkillToken)];
    if (group.includes(norm)) return group;
    for (const token of group) {
      if (token.length < 5) continue;
      if (norm === token || norm.startsWith(`${token} `)) return group;
    }
  }
  return null;
}

function expandedSkillTokens(label: string): string[] {
  const norm = normalizeSkillToken(label);
  const out = new Set<string>([norm]);

  const group = skillAliasGroupForToken(norm);
  if (group) {
    for (const token of group) out.add(token);
  }

  return [...out];
}

/** True when a job skill requirement matches a resume/profile skill token. */
export function skillLabelsMatch(
  requirement: string,
  candidate: string,
): boolean {
  const reqTokens = expandedSkillTokens(requirement);
  const candTokens = expandedSkillTokens(candidate);

  for (const req of reqTokens) {
    for (const cand of candTokens) {
      if (req === cand || req.includes(cand) || cand.includes(req)) {
        return true;
      }
    }
  }

  return false;
}

export function findSkillLabelMatch(
  requirement: string,
  candidates: string[],
): string | null {
  for (const candidate of candidates) {
    if (skillLabelsMatch(requirement, candidate)) {
      return candidate.trim();
    }
  }
  return null;
}

/** Match pool for skills scoring (includes aliases). */
export function skillsMatchPoolForScoring(
  resumeSkills: string[] | undefined | null,
  profileQualified?: string[] | null,
): string[] {
  const fromResume = dedupeSkills(resumeSkills ?? []);
  const inferredProfile =
    profileQualified && profileQualified.length > 0
      ? profileQualified
      : qualifiedSkillLabelsFromResume(fromResume);
  const fromProfile = dedupeSkills(inferredProfile ?? []);
  const seen = new Set(fromResume.map(normalizeSkillToken));
  const merged = [...fromResume];
  for (const label of fromProfile) {
    const key = normalizeSkillToken(label);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    merged.push(label);
  }
  return expandSkillMatchPool(merged);
}

/** Merge profile qualified skills into resume skills for scoring only. */
export function resumeSkillsForScoring(
  resumeSkills: string[] | undefined | null,
  profileQualified: string[] | null | undefined,
): string[] {
  return skillsMatchPoolForScoring(resumeSkills, profileQualified);
}

/** Profile qualified labels evidenced by parsed resume skills (for profile sync). */
export function qualifiedSkillLabelsFromResume(
  resumeSkills: string[] | undefined | null,
): string[] {
  const poolNorm = new Set(
    expandSkillMatchPool(dedupeSkills(resumeSkills ?? [])).map(normalizeSkillToken),
  );
  return PROFILE_QUALIFIED_SKILL_LABELS.filter((label) => {
    const aliases = expandSkillMatchPool([label]).map(normalizeSkillToken);
    return aliases.some((token) => poolNorm.has(token));
  });
}

/** Skills match pool including resume role, archetypes, and work history. */
export function resumeSkillMatchPool(
  resume: ParsedResume | null | undefined,
  profileQualified?: string[] | null,
): string[] {
  const contextLabels: string[] = [];
  if (resume?.roleTitle?.trim()) contextLabels.push(resume.roleTitle.trim());
  for (const archetype of resume?.archetypes ?? []) {
    if (archetype.trim()) contextLabels.push(archetype.trim());
  }
  for (const job of resume?.workHistory ?? []) {
    if (job.title?.trim()) contextLabels.push(job.title.trim());
    if (job.summary?.trim()) contextLabels.push(job.summary.trim());
  }

  return expandSkillMatchPool(
    dedupeSkills([
      ...skillsMatchPoolForScoring(resume?.skills, profileQualified),
      ...contextLabels,
    ]),
  );
}
