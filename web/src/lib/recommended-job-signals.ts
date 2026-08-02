import type { ParsedResume } from "@/lib/types";

export type RecommendedJobSignals = {
  keywords: string[];
  categories: string[];
};

/** Fallback Muse category when role mapping finds no match. */
const DEFAULT_MUSE_CATEGORY = "Design and UX";

const MAX_KEYWORDS = 16;
const MAX_CATEGORIES = 3;

/** Role phrase → Muse job categories (closest API primitive to industries). */
const ROLE_CATEGORY_RULES: { pattern: RegExp; categories: string[] }[] = [
  {
    pattern:
      /\b(product design|ux|ui\/ux|ui ux|user experience|user interface|visual design|interaction design|designer)\b/i,
    categories: ["Design and UX"],
  },
  {
    pattern:
      /\b(software engineer|software developer|full[- ]?stack|front[- ]?end|back[- ]?end|mobile engineer|ios engineer|android engineer|devops|sre)\b/i,
    categories: ["Software Engineering", "Computer and IT"],
  },
  {
    pattern: /\b(data scientist|data analyst|machine learning|analytics engineer|bi analyst)\b/i,
    categories: ["Data and Analytics"],
  },
  {
    pattern: /\b(product manager|program manager|project manager)\b/i,
    categories: ["Account Management/Customer Success", "Administration and Office"],
  },
  {
    pattern: /\b(marketing|growth|brand|content strateg|seo|sem)\b/i,
    categories: ["Advertising and Marketing", "Media, PR, and Communications"],
  },
  {
    pattern: /\b(recruiter|talent|human resources|people ops|hr )\b/i,
    categories: ["Human Resources and Recruitment"],
  },
  {
    pattern: /\b(writer|editor|copywriter|technical writer)\b/i,
    categories: ["Writing and Editing"],
  },
  {
    pattern: /\b(accountant|finance|financial analyst|controller)\b/i,
    categories: ["Accounting and Finance"],
  },
  {
    pattern: /\b(sales|account executive|business development)\b/i,
    categories: ["Account Management/Customer Success", "Advertising and Marketing"],
  },
  {
    pattern: /\b(customer success|support specialist|customer support)\b/i,
    categories: ["Account Management/Customer Success"],
  },
  {
    pattern: /\b(scientist|research scientist|mechanical engineer|electrical engineer)\b/i,
    categories: ["Science and Engineering"],
  },
];

function dedupePreserveOrder(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

function roleBlobFromResume(parsed: ParsedResume): string {
  return [
    parsed.roleTitle ?? "",
    ...(parsed.archetypes ?? []),
    ...(parsed.workHistory ?? []).slice(0, 4).map((w) => w.title ?? ""),
  ].join(" ");
}

export function museCategoriesFromRoleBlob(roleBlob: string): string[] {
  const matched: string[] = [];
  for (const rule of ROLE_CATEGORY_RULES) {
    if (!rule.pattern.test(roleBlob)) continue;
    for (const category of rule.categories) {
      if (!matched.includes(category)) matched.push(category);
    }
  }
  if (matched.length === 0) return [DEFAULT_MUSE_CATEGORY];
  return matched.slice(0, MAX_CATEGORIES);
}

/** Build Muse query signals from a parsed resume. */
export function buildRecommendedJobSignals(
  parsed: ParsedResume,
): RecommendedJobSignals {
  const roleKeywords = dedupePreserveOrder([
    parsed.roleTitle?.trim() ?? "",
    ...(parsed.archetypes ?? []),
    ...(parsed.workHistory ?? []).slice(0, 5).map((w) => w.title?.trim() ?? ""),
  ]);

  const skillKeywords = dedupePreserveOrder(parsed.skills ?? []).slice(0, 8);
  const keywords = dedupePreserveOrder([...roleKeywords, ...skillKeywords]).slice(
    0,
    MAX_KEYWORDS,
  );

  const categories = museCategoriesFromRoleBlob(roleBlobFromResume(parsed));

  return { keywords, categories };
}

/** Loose parse of resumes.parsed_resume_json (may be partial). */
export function parseResumeJsonForSignals(
  value: unknown,
): ParsedResume | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;

  const workHistory = Array.isArray(raw.workHistory)
    ? raw.workHistory
        .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
        .map((item) => ({
          title: typeof item.title === "string" ? item.title : "",
          company: typeof item.company === "string" ? item.company : "",
          startDate: typeof item.startDate === "string" ? item.startDate : null,
          endDate: typeof item.endDate === "string" ? item.endDate : null,
          summary: typeof item.summary === "string" ? item.summary : null,
        }))
    : [];

  const asStringArray = (v: unknown): string[] =>
    Array.isArray(v)
      ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
      : [];

  const roleTitle =
    typeof raw.roleTitle === "string" && raw.roleTitle.trim()
      ? raw.roleTitle.trim()
      : null;

  const parsed: ParsedResume = {
    skills: asStringArray(raw.skills),
    industries: asStringArray(raw.industries),
    workHistory,
    aiExperience: asStringArray(raw.aiExperience),
    tools: asStringArray(raw.tools),
    archetypes: asStringArray(raw.archetypes),
    roleTitle,
  };

  const hasSignal =
    Boolean(parsed.roleTitle) ||
    parsed.archetypes.length > 0 ||
    parsed.workHistory.some((w) => w.title.trim()) ||
    parsed.skills.length > 0;

  return hasSignal ? parsed : null;
}
