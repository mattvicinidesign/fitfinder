/** Profile qualified skills — used for Skills scoring only (not shown on resume). */

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
  ],
  [normalizeSkillToken("User Experience Design")]: [
    "ux design",
    "user experience",
    "experience design",
    "ux designer",
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

/** Merge profile qualified skills into resume skills for scoring only. */
export function resumeSkillsForScoring(
  resumeSkills: string[] | undefined | null,
  profileQualified: string[] | null | undefined,
): string[] {
  const fromResume = dedupeSkills(resumeSkills ?? []);
  const fromProfile = dedupeSkills(profileQualified ?? []);

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
