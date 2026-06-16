import {
  extractToolsFromJobText,
  partitionSkillsAndTools,
} from "./normalize_parsed_job.ts";
import { isExcludedIndustryMatch } from "./qualified_industries.ts";
import {
  type CanonicalTechIndustry,
  extractIndustriesFromText,
  normalizeIndustryList,
} from "./tech_industries.ts";
import type { ParsedResume } from "./types.ts";
import { extractPortfolioFromText, normalizePortfolioUrl } from "./portfolio_url.ts";

function dedupeSkills(skills: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of skills) {
    const key = s.toLowerCase().trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(s.trim());
  }
  return out;
}

function dedupeTools(tools: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of tools) {
    const key = t.toLowerCase().replace(/\s+/g, " ").trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(t.trim());
  }
  return out;
}

function workHistoryText(parsed: ParsedResume): string {
  return parsed.workHistory
    .map((w) => [w.title, w.company, w.summary ?? ""].join(" "))
    .join("\n");
}

function inferIndustriesFromResumeFields(
  parsed: ParsedResume,
): CanonicalTechIndustry[] {
  const blob = [
    ...(parsed.softwareModels ?? []),
    ...(parsed.industries ?? []),
    ...parsed.workHistory.flatMap((w) => [
      w.company,
      w.title,
      w.summary ?? "",
    ]),
  ].join("\n");
  return extractIndustriesFromText(blob);
}

/** Canonicalize industries and move misclassified craft labels into skills. */
export function normalizeParsedResume(
  parsed: ParsedResume,
  resumeText?: string,
): ParsedResume {
  const fromModel = normalizeIndustryList(parsed.industries);
  const fromText = resumeText ? extractIndustriesFromText(resumeText) : [];
  const fromFields = inferIndustriesFromResumeFields(parsed);

  const seen = new Set<string>(fromModel.industries);
  const industries = [...fromModel.industries];
  for (const label of [...fromText, ...fromFields]) {
    if (!seen.has(label)) {
      seen.add(label);
      industries.push(label);
    }
  }

  const { skills: skillsOnly, tools: toolsFromSkills } = partitionSkillsAndTools(
    parsed.skills ?? [],
  );
  const toolsFromText = resumeText ? extractToolsFromJobText(resumeText) : [];
  const toolsFromWork = extractToolsFromJobText(workHistoryText(parsed));

  const industriesFiltered = industries.filter(
    (l) => !isExcludedIndustryMatch(l),
  );

  const portfolioFromModel = parsed.portfolioUrl?.trim()
    ? normalizePortfolioUrl(parsed.portfolioUrl.trim())
    : null;
  const portfolioUrl =
    (resumeText
      ? extractPortfolioFromText(resumeText, { ...parsed, portfolioUrl: null })
      : null) ??
    portfolioFromModel ??
    null;

  return {
    ...parsed,
    industries: industriesFiltered,
    skills: dedupeSkills([...skillsOnly, ...fromModel.rehomedAsSkills]),
    tools: dedupeTools([
      ...(parsed.tools ?? []),
      ...toolsFromSkills,
      ...toolsFromText,
      ...toolsFromWork,
    ]),
    portfolioUrl,
  };
}
