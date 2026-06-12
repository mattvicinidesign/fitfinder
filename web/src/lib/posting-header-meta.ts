import { parseUpworkClientCityLine } from "@/lib/client-location-parse";

import {
  POSTING_DETAIL_MISSING,
  findPostingDetailRow,
  resolvePostingDetailRows,
} from "@/lib/posting-details";
import type { ParsedJob, PostingContext } from "@/lib/types";

const LOCAL_TIME_SUFFIX = /(\d{1,2}:\d{2}\s*(?:AM|PM))$/i;

const SKIP_CLIENT_NAME_LINE =
  /payment method|verified|rating|reviews?|of\s+\d|jobs?\s+posted|hire\s+rate|open\s+job|total\s+spent|hires|active|member\s+since|\$|avg\.?\s+hourly|hours$|^\d+(?:\.\d+)?\s*$/i;

const COUNTRY_OR_REGION_LINE =
  /^(worldwide|united states|usa|u\.s\.a\.|canada|united kingdom|uk|europe|americas)$/i;

function linesOf(text: string): string[] {
  return text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
}

function aboutClientBlock(jobText: string): string | null {
  const m = jobText.match(/\babout the client\b([\s\S]{0,1500})/i);
  return m?.[1]?.trim() ? m[1] : null;
}

function toTitleCaseWords(text: string): string {
  return text.replace(/\b\w+/g, (word) =>
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
  );
}

/** Company or individual name from About the client (when present). */
export function extractClientNameFromJobDescription(
  jobDescription?: string | null,
): string | null {
  const text = jobDescription?.trim();
  if (!text) return null;

  const block = aboutClientBlock(text);
  if (!block) return null;

  for (const raw of linesOf(block)) {
    const line = raw.replace(LOCAL_TIME_SUFFIX, "").trim();
    if (line.length < 2 || line.length > 100) continue;
    if (SKIP_CLIENT_NAME_LINE.test(line)) continue;
    if (COUNTRY_OR_REGION_LINE.test(line)) continue;
    if (parseUpworkClientCityLine(raw)) continue;
    if (/^\d/.test(line)) continue;
    if (!/[A-Za-z]{2,}/.test(line)) continue;
    return line;
  }

  return null;
}

export function hasNamedClientInPosting(companyName?: string | null): boolean {
  return Boolean(companyName?.trim());
}

/** Upwork when a client name exists; otherwise Upwork Client. */
export function headerPlatformLabel(companyName?: string | null): string {
  return hasNamedClientInPosting(companyName) ? "Upwork" : "Upwork Client";
}

export function headerEmployerKindLabel(
  employerType?: PostingContext["employerType"] | ParsedJob["employerType"],
): string {
  if (employerType === "agency") return "Agency";
  if (employerType === "product_company") return "Company";
  return "Not Found";
}

/** e.g. "Posted 4 days ago" → "4 Days Ago". */
export function formatHeaderDatePosted(raw?: string | null): string | null {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed || trimmed === POSTING_DETAIL_MISSING) return null;

  const withoutPosted = trimmed.replace(/^posted\s+/i, "").trim();
  return toTitleCaseWords(withoutPosted);
}

export interface PostingHeaderMetaInput {
  companyName?: string | null;
  jobDescription?: string | null;
  jobTitle?: string | null;
  parsedJob?: ParsedJob;
  postingContext?: PostingContext | null;
}

function headerHireAreaLabel(
  parsedJob: ParsedJob | undefined,
  jobDescription?: string | null,
  jobTitle?: string | null,
): string | null {
  if (!parsedJob) return null;

  const rows = resolvePostingDetailRows(parsedJob, { jobDescription, jobTitle });
  const hireArea = findPostingDetailRow(rows, "hireArea");

  const raw = hireArea?.value?.trim() ?? "";
  if (!raw || raw === POSTING_DETAIL_MISSING || hireArea?.missing) return null;

  return toTitleCaseWords(raw);
}

/** Build "Upwork | Agency | 4 Days Ago | Worldwide" (segments omitted when unknown). */
export function buildPostingHeaderMetaLine(
  input: PostingHeaderMetaInput,
): string | null {
  const { parsedJob, postingContext, jobDescription, jobTitle, companyName } =
    input;

  const employerType =
    postingContext?.employerType ?? parsedJob?.employerType ?? "unknown";

  const rows = parsedJob
    ? resolvePostingDetailRows(parsedJob, { jobDescription, jobTitle })
    : [];

  const datePostedRaw = findPostingDetailRow(rows, "datePosted")?.value;

  const segments = [
    headerPlatformLabel(companyName),
    headerEmployerKindLabel(employerType),
    formatHeaderDatePosted(datePostedRaw),
    headerHireAreaLabel(parsedJob, jobDescription, jobTitle),
  ].filter((s): s is string => Boolean(s?.trim()));

  if (segments.length === 0) return null;
  return segments.join(" | ");
}
