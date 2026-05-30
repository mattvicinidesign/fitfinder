// Post-process parsed job JSON so toolRequirements reflect the full posting
// (including bonus / nice-to-have sections the model often skips).

import { normalizePostingDetails } from "./posting_details.ts";
import {
  extractIndustriesFromText,
  normalizeIndustryList,
} from "./tech_industries.ts";
import type { ParsedJob } from "./types.ts";

/** Canonical display names keyed by normalized match phrases. */
const TOOL_PHRASES: ReadonlyArray<{ match: string; label: string }> = [
  { match: "adobe after effects", label: "After Effects" },
  { match: "after effects", label: "After Effects" },
  { match: "adobe premiere", label: "Premiere Pro" },
  { match: "premiere pro", label: "Premiere Pro" },
  { match: "adobe illustrator", label: "Illustrator" },
  { match: "adobe photoshop", label: "Photoshop" },
  { match: "adobe xd", label: "Adobe XD" },
  { match: "lottie", label: "Lottie" },
  { match: "lottiefiles", label: "Lottie" },
  { match: "blender", label: "Blender" },
  { match: "cinema 4d", label: "Cinema 4D" },
  { match: "c4d", label: "Cinema 4D" },
  { match: "figma", label: "Figma" },
  { match: "sketch", label: "Sketch" },
  { match: "framer", label: "Framer" },
  { match: "clickup", label: "ClickUp" },
  { match: "click up", label: "ClickUp" },
  { match: "principle", label: "Principle" },
  { match: "protopie", label: "ProtoPie" },
  { match: "invision", label: "InVision" },
  { match: "zeplin", label: "Zeplin" },
  { match: "miro", label: "Miro" },
  { match: "notion", label: "Notion" },
  { match: "jira", label: "Jira" },
  { match: "confluence", label: "Confluence" },
  { match: "slack", label: "Slack" },
  { match: "linear", label: "Linear" },
  { match: "asana", label: "Asana" },
  { match: "amplitude", label: "Amplitude" },
  { match: "mixpanel", label: "Mixpanel" },
  { match: "heap", label: "Heap" },
  { match: "fullstory", label: "FullStory" },
  { match: "hotjar", label: "Hotjar" },
  { match: "looker", label: "Looker" },
  { match: "tableau", label: "Tableau" },
  { match: "power bi", label: "Power BI" },
  { match: "google analytics", label: "Google Analytics" },
  { match: "ga4", label: "GA4" },
  { match: "webflow", label: "Webflow" },
  { match: "wordpress", label: "WordPress" },
  { match: "shopify", label: "Shopify" },
  { match: "react", label: "React" },
  { match: "next.js", label: "Next.js" },
  { match: "nextjs", label: "Next.js" },
  { match: "vue", label: "Vue" },
  { match: "angular", label: "Angular" },
  { match: "typescript", label: "TypeScript" },
  { match: "javascript", label: "JavaScript" },
  { match: "python", label: "Python" },
  { match: "node.js", label: "Node.js" },
  { match: "nodejs", label: "Node.js" },
  { match: "docker", label: "Docker" },
  { match: "kubernetes", label: "Kubernetes" },
  { match: "terraform", label: "Terraform" },
  { match: "aws", label: "AWS" },
  { match: "gcp", label: "GCP" },
  { match: "azure", label: "Azure" },
  { match: "github", label: "GitHub" },
  { match: "gitlab", label: "GitLab" },
  { match: "bitbucket", label: "Bitbucket" },
  { match: "chatgpt", label: "ChatGPT" },
  { match: "openai", label: "OpenAI" },
  { match: "midjourney", label: "Midjourney" },
  { match: "stable diffusion", label: "Stable Diffusion" },
  { match: "rive", label: "Rive" },
  { match: "spline", label: "Spline" },
  { match: "keyshot", label: "Keyshot" },
  { match: "substance painter", label: "Substance Painter" },
  { match: "unreal engine", label: "Unreal Engine" },
  { match: "unity", label: "Unity" },
  { match: "html", label: "HTML" },
  { match: "css", label: "CSS" },
  { match: "sass", label: "Sass" },
  { match: "tailwind", label: "Tailwind CSS" },
];

const BONUS_HEADER_LINE =
  /^(?:#{1,3}\s*)?(?:bonuses?|bonus\s+skills?|nice\s*to\s*have|nice-to-have|preferred(?:\s+qualifications|\s+skills|\s+tools)?|a\s+plus|pluses?|plus\s+if|desired(?:\s+skills|\s+tools)?|helpful|would\s+be\s+(?:great|nice)|optional)(?:\s*[:.\-–—]|\s*$)/i;

const MAIN_SECTION_LINE =
  /^(?:#{1,3}\s*)?(?:requirements?|required(?:\s+skills|\s+tools)?|must\s+have|qualifications|responsibilities|what\s+you(?:'ll| will)|about\s+(?:the\s+)?role|benefits|compensation|how\s+to\s+apply)/i;

const BONUS_INLINE_LINE =
  /\b(?:bonuses?|nice\s*to\s*have|preferred|a\s+plus|plus\s+if|optional)\b/i;

const SOFTWARE_IN_SKILL_RE =
  /^(adobe|figma|sketch|framer|miro|jira|slack|notion|webflow|shopify|wordpress|blender|lottie|after effects|premiere|photoshop|illustrator|invision|zeplin|protopie|principle|amplitude|mixpanel|docker|kubernetes|terraform|react|vue|angular|typescript|javascript|python|node\.?js|aws|gcp|azure|github|gitlab|rive|spline|cinema 4d|c4d|xd|html|css|tailwind|clickup)/i;

function normalizeKey(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

function dedupeLabels(labels: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const label of labels) {
    const key = normalizeKey(label);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(label.trim());
  }
  return out;
}

function toolsInText(text: string): string[] {
  const lower = text.toLowerCase();
  const found: string[] = [];
  for (const { match, label } of TOOL_PHRASES) {
    const idx = lower.indexOf(match);
    if (idx === -1) continue;
    const before = idx > 0 ? lower[idx - 1] : " ";
    const after = idx + match.length < lower.length ? lower[idx + match.length] : " ";
    if (!/[a-z0-9]/.test(before) && !/[a-z0-9]/.test(after)) {
      found.push(label);
    }
  }
  return found;
}

/** Collect text blocks that belong to bonus / nice-to-have sections. */
export function getBonusRegionTexts(jobText: string): string[] {
  const regions: string[] = [];
  let inBonus = false;

  for (const line of jobText.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (BONUS_HEADER_LINE.test(trimmed)) {
      inBonus = true;
      regions.push(trimmed);
      continue;
    }

    if (inBonus && MAIN_SECTION_LINE.test(trimmed) && !BONUS_HEADER_LINE.test(trimmed)) {
      inBonus = false;
      continue;
    }

    if (inBonus) {
      regions.push(trimmed);
    } else if (BONUS_INLINE_LINE.test(trimmed)) {
      regions.push(trimmed);
    }
  }

  const headerIdx = jobText.search(
    /\b(?:bonuses?|bonus\s+skills?|nice\s*to\s*have|nice-to-have)\b/i,
  );
  if (headerIdx >= 0) {
    regions.push(jobText.slice(headerIdx));
  }

  return regions;
}

function toolMentionedInRegions(toolLabel: string, regions: string[]): boolean {
  const key = normalizeKey(toolLabel);
  if (!key) return false;
  for (const region of regions) {
    const lower = region.toLowerCase();
    if (lower.includes(key)) return true;
    for (const { match, label } of TOOL_PHRASES) {
      if (normalizeKey(label) !== key && label !== toolLabel) continue;
      if (lower.includes(match)) return true;
    }
  }
  return false;
}

/** Tools mentioned in bonus / nice-to-have / preferred sections. */
export function extractBonusToolsFromJobText(jobText: string): string[] {
  const regions = getBonusRegionTexts(jobText);
  const found: string[] = [];
  for (const region of regions) {
    found.push(...toolsInText(region));
  }
  return dedupeLabels(found);
}

/** Tools explicitly mentioned anywhere in raw job text. */
export function extractToolsFromJobText(jobText: string): string[] {
  return dedupeLabels(toolsInText(jobText));
}

function isLikelyToolToken(token: string): boolean {
  const n = normalizeKey(token);
  if (!n || n.length > 48) return false;
  if (SOFTWARE_IN_SKILL_RE.test(n)) return true;
  return TOOL_PHRASES.some(({ match }) => n === match || n.includes(match) || match.includes(n));
}

/** Move software/platform tokens out of skills (job + resume). */
export function partitionSkillsAndTools(skills: string[]): {
  skills: string[];
  tools: string[];
} {
  const skillsOut: string[] = [];
  const toolsOut: string[] = [];
  for (const s of skills) {
    if (isLikelyToolToken(s)) toolsOut.push(s.trim());
    else skillsOut.push(s.trim());
  }
  return { skills: skillsOut, tools: toolsOut };
}

function partitionSkills(skills: string[]): {
  skills: string[];
  toolsFromSkills: string[];
} {
  const { skills: skillsOut, tools } = partitionSkillsAndTools(skills);
  return { skills: skillsOut, toolsFromSkills: tools };
}

/**
 * Merge LLM output with deterministic extraction from the raw posting.
 * Call immediately after job parse in analyze / parse-job.
 */
export function normalizeParsedJob(
  parsed: ParsedJob,
  jobText: string,
): ParsedJob {
  const toolsFromText = extractToolsFromJobText(jobText);
  const { skills, toolsFromSkills } = partitionSkills(parsed.skills ?? []);
  const bonusRegions = getBonusRegionTexts(jobText);

  const toolRequirements = dedupeLabels([
    ...(parsed.toolRequirements ?? []),
    ...toolsFromSkills,
    ...toolsFromText,
  ]);

  const bonusToolRequirements = dedupeLabels([
    ...extractBonusToolsFromJobText(jobText),
    ...(parsed.bonusToolRequirements ?? []),
    ...toolRequirements.filter((tool) =>
      toolMentionedInRegions(tool, bonusRegions),
    ),
  ]);

  const fromModel = normalizeIndustryList(parsed.industries);
  const industriesFromText = extractIndustriesFromText(jobText);
  const industrySeen = new Set<string>(fromModel.industries);
  const industries = [...fromModel.industries];
  for (const label of industriesFromText) {
    if (!industrySeen.has(label)) {
      industrySeen.add(label);
      industries.push(label);
    }
  }

  const postingDetails = normalizePostingDetails(parsed, jobText);

  return {
    ...parsed,
    skills: dedupeLabels([...skills, ...fromModel.rehomedAsSkills]),
    industries,
    toolRequirements,
    bonusToolRequirements,
    postingDetails,
  };
}
