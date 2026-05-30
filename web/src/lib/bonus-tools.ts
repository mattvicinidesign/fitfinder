import type { ParsedJob } from "@/lib/types";

function normalizeKey(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

function labelsMatch(a: string, b: string): boolean {
  const ak = normalizeKey(a);
  const bk = normalizeKey(b);
  if (!ak || !bk) return false;
  return ak === bk || ak.includes(bk) || bk.includes(ak);
}

const BONUS_HEADER_LINE =
  /^(?:#{1,3}\s*)?(?:bonuses?|bonus\s+skills?|nice\s*to\s*have|nice-to-have|preferred(?:\s+qualifications|\s+skills|\s+tools)?|a\s+plus|pluses?|plus\s+if|desired(?:\s+skills|\s+tools)?|helpful|would\s+be\s+(?:great|nice)|optional)(?:\s*[:.\-–—]|\s*$)/i;

const MAIN_SECTION_LINE =
  /^(?:#{1,3}\s*)?(?:requirements?|required(?:\s+skills|\s+tools)?|must\s+have|qualifications|responsibilities|what\s+you(?:'ll| will)|about\s+(?:the\s+)?role|benefits|compensation|how\s+to\s+apply)/i;

const BONUS_INLINE_LINE =
  /\b(?:bonuses?|nice\s*to\s*have|preferred|a\s+plus|plus\s+if|optional)\b/i;

const TOOL_PHRASES: ReadonlyArray<{ match: string; label: string }> = [
  { match: "after effects", label: "After Effects" },
  { match: "lottie", label: "Lottie" },
  { match: "blender", label: "Blender" },
  { match: "wordpress", label: "WordPress" },
  { match: "clickup", label: "ClickUp" },
  { match: "click up", label: "ClickUp" },
  { match: "slack", label: "Slack" },
  { match: "figma", label: "Figma" },
];

function getBonusRegionTexts(jobText: string): string[] {
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
    for (const { match } of TOOL_PHRASES) {
      if (lower.includes(match) && (key.includes(match) || match.includes(key))) {
        return true;
      }
    }
  }
  return false;
}

/** Resolve bonus tools from API field or re-scan pasted job text (client fallback). */
export function resolveBonusToolRequirements(
  job: ParsedJob,
  jobDescription?: string | null,
): string[] {
  if (job.bonusToolRequirements?.length) {
    return job.bonusToolRequirements;
  }
  if (!jobDescription?.trim()) {
    return [];
  }

  const regions = getBonusRegionTexts(jobDescription);
  return (job.toolRequirements ?? []).filter((tool) =>
    toolMentionedInRegions(tool, regions),
  );
}

export function isToolListedInBonus(
  toolLabel: string,
  job: ParsedJob,
  jobDescription?: string | null,
): boolean {
  const bonusTools = resolveBonusToolRequirements(job, jobDescription);
  return bonusTools.some((b) => labelsMatch(toolLabel, b));
}
