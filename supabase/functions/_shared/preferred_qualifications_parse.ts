/**
 * Upwork "Preferred qualifications" — keep in sync with
 * web/src/lib/preferred-qualifications-parse.ts
 */

export interface PreferredQualificationsFields {
  location: string | null;
  country: string | null;
  timezone: string | null;
  talentType: string | null;
}

function linesOf(text: string): string[] {
  return text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
}

export function preferredQualificationsSection(jobText: string): string | null {
  const m = jobText.match(
    /\bpreferred\s+qualifications\b([\s\S]*?)(?=\bactivity on this job\b|\babout the client\b|\bsubmit a proposal\b|\bsimilar jobs on upwork\b|$)/i,
  );
  return m?.[1]?.trim() ? m[1] : null;
}

export function extractLabelValueFromBlock(
  block: string,
  label: string,
): string | null {
  const lines = linesOf(block);
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const inlineRe = new RegExp(`^${escaped}\\s*:\\s*(.+)$`, "i");
  const labelOnlyRe = new RegExp(`^${escaped}\\s*:?\\s*$`, "i");

  for (let i = 0; i < lines.length; i++) {
    const inline = lines[i].match(inlineRe);
    if (inline?.[1]?.trim()) return inline[1].trim();

    if (labelOnlyRe.test(lines[i])) {
      for (let j = i + 1; j < lines.length; j++) {
        const next = lines[j];
        if (!next || /^[A-Za-z][\w\s]*:\s*$/.test(next) || /^[A-Za-z][\w\s]*:\s*.+/.test(next)) {
          break;
        }
        return next;
      }
    }
  }

  const blockMatch = block.match(
    new RegExp(`(?:^|\\n)\\s*${escaped}\\s*:\\s*([^\\n]+)`, "im"),
  );
  return blockMatch?.[1]?.trim() ?? null;
}

export function extractPreferredQualificationsFields(
  jobText: string,
): PreferredQualificationsFields {
  const block = preferredQualificationsSection(jobText);
  if (!block) {
    return { location: null, country: null, timezone: null, talentType: null };
  }

  const location = extractLabelValueFromBlock(block, "Location");
  const country =
    extractLabelValueFromBlock(block, "Country") ??
    extractLabelValueFromBlock(block, "Country required");
  const timezone =
    extractLabelValueFromBlock(block, "Time zone") ??
    extractLabelValueFromBlock(block, "Timezone") ??
    extractLabelValueFromBlock(block, "Time Zone");
  const talentType = extractLabelValueFromBlock(block, "Talent Type");

  return { location, country, timezone, talentType };
}

export function resolveJobTalentType(
  jobDescription?: string | null,
): string | null {
  const text = jobDescription?.trim();
  if (!text) return null;
  return extractPreferredQualificationsFields(text).talentType;
}

const VAGUE_LOCATION_REQUIREMENT =
  /\b(worldwide|global|anywhere|any\s+country|open\s+to\s+all)\b/i;

function isVagueLocationRequirement(value: string): boolean {
  return VAGUE_LOCATION_REQUIREMENT.test(value.trim());
}

export function resolveJobPreferredLocation(
  parsedJob: { countryRequirement?: string | null } | undefined,
  jobDescription?: string | null,
): string | null {
  const text = jobDescription?.trim();
  if (text) {
    const pq = extractPreferredQualificationsFields(text);
    if (pq.location?.trim()) return pq.location.trim();
    if (pq.country?.trim()) return pq.country.trim();
  }

  const fromJob = parsedJob?.countryRequirement?.trim();
  if (fromJob && !isVagueLocationRequirement(fromJob)) return fromJob;

  return null;
}

export function resolveJobCountryRequirement(
  parsedJob: { countryRequirement?: string | null } | undefined,
  jobDescription?: string | null,
): string | null {
  return resolveJobPreferredLocation(parsedJob, jobDescription);
}

export function resolveJobTimezoneRequirement(
  _parsedJob: { timezoneRequirement?: string | null } | undefined,
  jobDescription?: string | null,
): string | null {
  const text = jobDescription?.trim();
  if (!text) return null;

  const pq = extractPreferredQualificationsFields(text);
  return pq.timezone ?? null;
}
