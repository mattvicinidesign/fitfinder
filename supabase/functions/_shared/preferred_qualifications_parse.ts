/**
 * Applicant location preferences — Preferred qualifications + header metadata.
 * NOT the client's country from "About the client".
 * Keep in sync with web/src/lib/preferred-qualifications-parse.ts
 */

function normalizeToken(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCountry(value: string): string {
  const n = normalizeToken(value);
  if (n === "us" || n === "usa" || n.includes("united states")) return "us";
  return n;
}

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

function aboutClientSection(jobText: string): string | null {
  const m = jobText.match(
    /\babout the client\b([\s\S]*?)(?=\bjob link\b|\bsimilar jobs on upwork\b|\bsubmit a proposal\b|$)/i,
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

export function isVagueLocationRequirement(value: string): boolean {
  return VAGUE_LOCATION_REQUIREMENT.test(value.trim());
}

const HEADER_US_ONLY =
  /only freelancers located in(?:\s+the)?\s+(?:u\.?\s*s\.?|united states)/i;

const HEADER_HIRE_AREA_LINE =
  /^(Worldwide|United States(?:\s+only)?|U\.S\.(?:\s+only)?|Americas,?\s*Europe|Europe|UK|Canada|Australia)$/i;

export function extractHeaderLocationPreference(
  jobText: string,
): string | null {
  const lines = linesOf(jobText);
  const headerLines = lines.slice(0, 40);

  for (const line of headerLines) {
    if (HEADER_US_ONLY.test(line)) return "United States";
  }

  for (let i = 0; i < headerLines.length - 1; i++) {
    if (!/^posted\s/i.test(headerLines[i])) continue;
    const next = headerLines[i + 1];
    if (HEADER_US_ONLY.test(next)) return "United States";
    if (HEADER_HIRE_AREA_LINE.test(next)) return next;
  }

  return null;
}

export function isClientOriginNotApplicantPreference(
  requirement: string,
  parsedJob?: {
    countryRequirement?: string | null;
    postingDetails?: { clientOrigin?: string | null };
  },
  jobDescription?: string | null,
): boolean {
  const reqNorm = normalizeCountry(requirement);
  if (!reqNorm) return false;

  const clientOrigin = parsedJob?.postingDetails?.clientOrigin?.trim();
  if (clientOrigin && normalizeCountry(clientOrigin) === reqNorm) {
    const pq = jobDescription
      ? extractPreferredQualificationsFields(jobDescription)
      : null;
    const header = jobDescription
      ? extractHeaderLocationPreference(jobDescription)
      : null;
    const pqSaysSame =
      (pq?.location && normalizeCountry(pq.location) === reqNorm) ||
      (pq?.country && normalizeCountry(pq.country) === reqNorm);
    const headerSaysSame =
      header != null && normalizeCountry(header) === reqNorm;
    if (!pqSaysSame && !headerSaysSame) return true;
  }

  const about = jobDescription ? aboutClientSection(jobDescription) : null;
  if (!about) return false;

  const aboutNorm = about.toLowerCase();
  const mentionsInAbout =
    reqNorm === "us"
      ? /\bunited states\b|\bu\.?\s*s\.?\b|\busa\b/.test(aboutNorm)
      : aboutNorm.includes(reqNorm);

  if (!mentionsInAbout) return false;

  const beforeAbout = jobDescription!.split(/\babout the client\b/i)[0] ?? "";
  const pq = extractPreferredQualificationsFields(beforeAbout);
  if (pq.location?.trim() || pq.country?.trim()) return false;

  const headerPref = extractHeaderLocationPreference(beforeAbout);
  if (headerPref && !isVagueLocationRequirement(headerPref)) return false;

  return true;
}

export function resolveJobPreferredLocation(
  parsedJob?: {
    countryRequirement?: string | null;
    postingDetails?: { clientOrigin?: string | null };
  },
  jobDescription?: string | null,
): string | null {
  const text = jobDescription?.trim();
  if (text) {
    const pq = extractPreferredQualificationsFields(text);
    if (pq.location?.trim()) return pq.location.trim();
    if (pq.country?.trim()) return pq.country.trim();

    const fromHeader = extractHeaderLocationPreference(text);
    if (fromHeader?.trim() && !isVagueLocationRequirement(fromHeader)) {
      return fromHeader.trim();
    }
  }

  const fromParse = parsedJob?.countryRequirement?.trim();
  if (
    fromParse &&
    !isVagueLocationRequirement(fromParse) &&
    !isClientOriginNotApplicantPreference(fromParse, parsedJob, text)
  ) {
    return fromParse;
  }

  return null;
}

export function resolveJobCountryRequirement(
  parsedJob?: {
    countryRequirement?: string | null;
    postingDetails?: { clientOrigin?: string | null };
  },
  jobDescription?: string | null,
): string | null {
  return resolveJobPreferredLocation(parsedJob, jobDescription);
}

export function resolveJobTimezoneRequirement(
  _parsedJob?: { timezoneRequirement?: string | null },
  jobDescription?: string | null,
): string | null {
  const text = jobDescription?.trim();
  if (!text) return null;

  const pq = extractPreferredQualificationsFields(text);
  return pq.timezone ?? null;
}

export function sanitizeCountryRequirement(
  parsedJob: {
    countryRequirement?: string | null;
    postingDetails?: { clientOrigin?: string | null };
  },
  jobDescription?: string | null,
): string | null {
  const req = parsedJob.countryRequirement?.trim();
  if (!req) return null;
  if (isClientOriginNotApplicantPreference(req, parsedJob, jobDescription)) {
    return null;
  }
  if (isVagueLocationRequirement(req)) return null;
  return req;
}
