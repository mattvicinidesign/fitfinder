/**
 * Non-scored posting metadata — keep in sync with
 * supabase/functions/_shared/posting_details.ts
 */

import { extractClientCityFromAboutClient } from "@/lib/client-location-parse";
import { normalizeCountry } from "@/lib/country-match";
import type { Compensation, JobPostingDetails, ParsedJob } from "@/lib/types";

export type { JobPostingDetails };

export const POSTING_DETAIL_MISSING = "—";

/** True when parsed client origin is US (United States, USA, U.S., etc.). */
export function isUnitedStatesClientOrigin(value: string): boolean {
  if (!value || value === POSTING_DETAIL_MISSING) return false;
  return normalizeCountry(value) === "us";
}

/** Parse first hourly $ amount from a posting-detail label (e.g. "$35.18 /hr"). */
export function parseHourlyRateFromLabel(label: string): number | null {
  if (!label || label === POSTING_DETAIL_MISSING) return null;
  const m = label.match(/\$\s*([\d,]+(?:\.\d+)?)\s*(?:\/\s*|-\s*)?(?:hr|hour)\b/i);
  if (!m) return null;
  const n = Number.parseFloat(m[1].replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

/** Onboarding / profile ask floor in $/hr (uses min when period is hour). */
export function profileOnboardingHourlyFloor(
  compensation: Compensation | null | undefined,
): number | null {
  if (!compensation || compensation.period !== "hour") return null;
  const floor = compensation.min ?? compensation.max;
  return floor != null && Number.isFinite(floor) ? floor : null;
}

/** Green when client avg hourly paid is at or above profile onboarding rate. */
export function isClientAvgHourlyAtOrAboveProfile(
  clientAvgLabel: string,
  profileCompensation: Compensation | null | undefined,
): boolean {
  if (clientAvgLabel.includes("(job budget)")) return false;
  const clientRate = parseHourlyRateFromLabel(clientAvgLabel);
  const floor = profileOnboardingHourlyFloor(profileCompensation);
  if (clientRate == null || floor == null) return false;
  return clientRate >= floor;
}

const COUNTRY_LINES =
  /^(United States|USA|U\.S\.A\.|Canada|United Kingdom|UK|Germany|France|India|Australia|Netherlands|Spain|Italy|Brazil|Mexico)$/i;

const HIRE_AREA_LINE =
  /^(Worldwide|United States(?:\s+only)?|U\.S\.(?:\s+only)?|Americas,?\s*Europe|Europe|UK|Canada|Australia)$/i;

function trimOrNull(value: unknown, maxLen = 160): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  if (!t) return null;
  return t.length > maxLen ? `${t.slice(0, maxLen - 1)}…` : t;
}

function linesOf(text: string): string[] {
  return text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
}

function firstCapture(text: string, patterns: RegExp[]): string | null {
  for (const re of patterns) {
    const m = text.match(re);
    const g = m?.[1]?.trim();
    if (g) return g;
    const full = m?.[0]?.trim();
    if (full && patterns.length > 0) return full;
  }
  return null;
}

function aboutClientSection(text: string): string | null {
  const m = text.match(/\babout the client\b([\s\S]{0,1500})/i);
  return m ? m[1] : null;
}

function extractDatePosted(text: string, lines: string[]): string | null {
  return (
    firstCapture(text, [
      /(posted\s+\d+\s+(?:seconds?|minutes?|hours?|days?|weeks?|months?)\s+ago)/i,
      /(posted\s+(?:yesterday|today))/i,
      /(?:^|\n)\s*posted\s+([A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4}[^\n]*)/i,
    ]) ??
    lines.find((l) => /^posted\s+\d/i.test(l)) ??
    null
  );
}

function extractHireArea(text: string, lines: string[]): string | null {
  for (let i = 0; i < lines.length - 1; i++) {
    if (/^posted\s/i.test(lines[i]) && HIRE_AREA_LINE.test(lines[i + 1])) {
      return lines[i + 1];
    }
  }

  const locationField = firstCapture(text, [
    /(?:^|\n)\s*location\s*:\s*([^\n]+)/i,
    /preferred\s+qualifications[\s\S]{0,400}?location\s*:\s*([^\n]+)/i,
  ]);
  if (locationField) return locationField;

  const worldwide = lines.find((l) => HIRE_AREA_LINE.test(l));
  if (worldwide) return worldwide;

  const needsHire = firstCapture(text, [
    /(needs\s+to\s+hire\s+[^\n]+)/i,
  ]);
  if (needsHire) return needsHire;

  return firstCapture(text, [
    /(?:looking\s+to\s+hire\s+in|hire\s+in|talent\s+location)\s*[:\-]?\s*([^\n]+)/i,
  ]);
}

function extractClientRating(text: string, clientBlock: string | null): string | null {
  const blocks = [clientBlock, text].filter(Boolean) as string[];
  for (const block of blocks) {
    const ratingIs = block.match(
      /rating\s+is\s+(\d+(?:\.\d+)?(?:\s+out\s+of\s+\d+)?)/i,
    );
    if (ratingIs) return ratingIs[1].trim();

    const ofFive = block.match(/(\d+(?:\.\d+)?)\s+out\s+of\s+5/i);
    if (ofFive) return `${ofFive[1]} out of 5`;

    const ofReviews = block.match(/(\d+(?:\.\d+)?)\s+of\s+\d+\s+reviews?/i);
    if (ofReviews) return `${ofReviews[1]} out of 5`;
  }
  return null;
}

function extractClientOrigin(
  clientBlock: string | null,
  lines: string[],
): string | null {
  if (clientBlock) {
    for (const line of linesOf(clientBlock)) {
      if (COUNTRY_LINES.test(line)) return line;
    }
  }

  if (clientBlock) {
    const idx = lines.findIndex((l) => /about the client/i.test(l));
    if (idx >= 0) {
      for (let i = idx + 1; i < Math.min(idx + 12, lines.length); i++) {
        if (COUNTRY_LINES.test(lines[i])) return lines[i];
      }
    }
  }

  return null;
}

function extractClientAvgHourly(text: string, clientBlock: string | null): string | null {
  const blocks = [clientBlock, text].filter(Boolean) as string[];
  for (const block of blocks) {
    const m = block.match(
      /(\$[\d,.]+\s*\/\s*hr)\s+avg\.?\s+hourly\s+rate\s+paid/i,
    );
    if (m) return m[1].trim();

    const m2 = block.match(
      /avg\.?\s+hourly\s+rate\s+paid\s*[:\-]?\s*(\$[\d,.]+\s*(?:\/\s*hr)?)/i,
    );
    if (m2) return m2[1].trim();
  }
  return null;
}

function extractHoursNeeded(text: string, lines: string[]): string | null {
  const fromRegex = firstCapture(text, [
    /((?:more|less)\s+than\s+\d+\s+hrs?\s*\/\s*week)/i,
    /((?:more|less)\s+than\s+\d+\s+hours\s*(?:\/\s*week|per\s+week)?)/i,
    /(\d+\s*\+\s*hrs?\s*\/\s*week)/i,
    /(?:hours\s+needed|weekly\s+hours)\s*[:\-]?\s*([^\n]+)/i,
  ]);
  if (fromRegex) return fromRegex;

  return (
    lines.find((l) => /(?:more|less)\s+than\s+\d+\s+hrs?\s*\/\s*week/i.test(l)) ??
    null
  );
}

function extractDuration(text: string, lines: string[]): string | null {
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].toLowerCase() === "duration" && i > 0) {
      const prev = lines[i - 1];
      if (/(?:more|less)\s+than|\d+\s*to\s*\d+|\d+\+\s*|\bmonth|\bweek/i.test(prev)) {
        return prev;
      }
    }
  }

  return (
    firstCapture(text, [
      /((?:more|less)\s+than\s+\d+\s+months?)/i,
      /((?:more|less)\s+than\s+\d+\s+weeks?)/i,
      /(\d+\s*to\s*\d+\s+months?)/i,
    ]) ??
    lines.find((l) => /(?:more|less)\s+than\s+\d+\s+months?/i.test(l)) ??
    null
  );
}

/** Deterministic extraction from pasted postings (Upwork-style). */
export function extractPostingDetailsFromText(
  jobText: string,
): Partial<JobPostingDetails> {
  const text = jobText.trim();
  if (!text) return {};

  const lines = linesOf(text);
  const clientBlock = aboutClientSection(text);

  return {
    datePosted: extractDatePosted(text, lines) ?? undefined,
    hireArea: extractHireArea(text, lines) ?? undefined,
    clientRating: extractClientRating(text, clientBlock) ?? undefined,
    clientOrigin: extractClientOrigin(clientBlock, lines) ?? undefined,
    clientCity: extractClientCityFromAboutClient(text) ?? undefined,
    clientAverageHourlyRate:
      extractClientAvgHourly(text, clientBlock) ?? undefined,
    hoursNeeded: extractHoursNeeded(text, lines) ?? undefined,
    duration: extractDuration(text, lines) ?? undefined,
  };
}

function mergeDetail(
  ...candidates: (string | null | undefined)[]
): string | null {
  for (const c of candidates) {
    const t = trimOrNull(c);
    if (t) return t;
  }
  return null;
}

function durationFallback(job: ParsedJob): string | null {
  if (job.engagementDuration === "ongoing") return "More than 6 months (inferred)";
  if (job.engagementDuration === "short_term") return "Short-term (inferred)";
  return null;
}

function hireAreaFallback(job: ParsedJob): string | null {
  const parts = [
    trimOrNull(job.countryRequirement),
    trimOrNull(job.timezoneRequirement),
  ].filter(Boolean) as string[];
  if (parts.length === 0) return null;
  return parts.join(" · ");
}

function hourlyRateFallback(job: ParsedJob): string | null {
  const comp = job.compensation;
  if (!comp || comp.period !== "hour") return null;
  const min = comp.min;
  const max = comp.max;
  const cur = comp.currency ?? "USD";
  if (min != null && max != null && min !== max) {
    return `$${min}-$${max}/hr (job budget)`;
  }
  const single = max ?? min;
  if (single != null) return `$${single}/hr (job budget)`;
  return null;
}

function roleFromFirstLine(text: string): string | null {
  const first = linesOf(text)[0];
  if (!first || first.length > 140) return null;
  if (/^posted\s/i.test(first)) return null;
  return first;
}

function inferDetailsFromParsedJob(
  parsed: ParsedJob,
): Partial<JobPostingDetails> {
  return {
    hireArea: hireAreaFallback(parsed),
    duration: durationFallback(parsed),
    clientAverageHourlyRate: hourlyRateFallback(parsed),
  };
}

export function normalizePostingDetails(
  parsed: ParsedJob,
  jobText: string,
): JobPostingDetails {
  const fromText = extractPostingDetailsFromText(jobText);
  const fromJob = inferDetailsFromParsedJob(parsed);
  const raw = parsed.postingDetails;

  return {
    datePosted: mergeDetail(raw?.datePosted, fromText.datePosted),
    hireArea: mergeDetail(raw?.hireArea, fromText.hireArea),
    clientRating: mergeDetail(raw?.clientRating, fromText.clientRating),
    clientOrigin: mergeDetail(raw?.clientOrigin, fromText.clientOrigin),
    clientCity: mergeDetail(raw?.clientCity, fromText.clientCity),
    clientAverageHourlyRate: mergeDetail(
      raw?.clientAverageHourlyRate,
      fromText.clientAverageHourlyRate,
      fromJob.clientAverageHourlyRate,
    ),
    hoursNeeded: mergeDetail(raw?.hoursNeeded, fromText.hoursNeeded),
    duration: mergeDetail(raw?.duration, fromText.duration, fromJob.duration),
  };
}

export type PostingDetailSection = "client" | "role" | "global";

export interface PostingDetailRow {
  key: string;
  title: string;
  value: string;
  missing: boolean;
  section: PostingDetailSection;
}

export interface PostingDetailSectionGroup {
  id: PostingDetailSection;
  title: string;
  rows: PostingDetailRow[];
}

const ROW_DEFS: {
  key: keyof JobPostingDetails | "role";
  title: string;
  section: PostingDetailSection;
}[] = [
  { key: "clientOrigin", title: "Location", section: "client" },
  { key: "clientRating", title: "Rating", section: "client" },
  { key: "clientAverageHourlyRate", title: "Avg Pay rate", section: "client" },
  { key: "role", title: "Title", section: "role" },
  { key: "hoursNeeded", title: "Hours", section: "role" },
  { key: "duration", title: "Duration", section: "role" },
  { key: "hireArea", title: "Who Can Apply", section: "global" },
  { key: "datePosted", title: "Date posted", section: "global" },
];

const SECTION_META: { id: PostingDetailSection; title: string }[] = [
  { id: "client", title: "Client Profile" },
  { id: "role", title: "Role Details" },
  { id: "global", title: "Global" },
];

export interface ResolvePostingDetailsOptions {
  jobDescription?: string | null;
  jobTitle?: string | null;
}

export function buildPostingDetailRows(
  job: ParsedJob,
  options?: ResolvePostingDetailsOptions,
): PostingDetailRow[] {
  const d = job.postingDetails;

  return ROW_DEFS.map(({ key, title, section }) => {
    let value: string | null = null;
    if (key === "role") {
      value = mergeDetail(
        job.roleTitle,
        options?.jobTitle,
        options?.jobDescription ? roleFromFirstLine(options.jobDescription) : null,
      );
    } else if (d) {
      value = trimOrNull(d[key]);
    }
    const missing = !value;
    return {
      key,
      title,
      value: value ?? POSTING_DETAIL_MISSING,
      missing,
      section,
    };
  });
}

export function findPostingDetailRow(
  rows: PostingDetailRow[],
  key: string,
): PostingDetailRow | undefined {
  return rows.find((r) => r.key === key);
}

export function postingDetailRowsForSection(
  rows: PostingDetailRow[],
  section: PostingDetailSection,
): PostingDetailRow[] {
  return rows.filter((r) => r.section === section);
}

export function groupPostingDetailRows(rows: PostingDetailRow[]): PostingDetailSectionGroup[] {
  return SECTION_META.map(({ id, title }) => ({
    id,
    title,
    rows: rows.filter((r) => r.section === id),
  }));
}

export function resolvePostingDetailSections(
  job: ParsedJob,
  options?: ResolvePostingDetailsOptions,
): PostingDetailSectionGroup[] {
  return groupPostingDetailRows(
    buildPostingDetailRows(enrichParsedJobForPostingDetails(job, options), options),
  );
}

export function enrichParsedJobForPostingDetails(
  job: ParsedJob,
  options?: ResolvePostingDetailsOptions,
): ParsedJob {
  const jobText = options?.jobDescription?.trim();
  if (!jobText) return job;
  return {
    ...job,
    postingDetails: normalizePostingDetails(job, jobText),
    roleTitle:
      mergeDetail(
        job.roleTitle,
        options?.jobTitle,
        roleFromFirstLine(jobText),
      ) ?? job.roleTitle,
  };
}

export function resolvePostingDetailRows(
  job: ParsedJob,
  options?: ResolvePostingDetailsOptions,
): PostingDetailRow[] {
  return buildPostingDetailRows(
    enrichParsedJobForPostingDetails(job, options),
    options,
  );
}
