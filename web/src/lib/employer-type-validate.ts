/**
 * Conservative employer-type classification from job text.
 * Keep in sync with supabase/functions/_shared/employer_type_validate.ts
 */

import type { ParsedJob } from "@/lib/types";

const AGENCY_EVIDENCE: RegExp[] = [
  /\bagency\b/i,
  /\bagencies\b/i,
  /\bmarketing agency\b/i,
  /\bcreative agency\b/i,
  /\bdesign agency\b/i,
  /\bdigital agency\b/i,
  /\bdevelopment agency\b/i,
  /\bdev agency\b/i,
  /\bconsultancy\b/i,
  /\bconsulting firm\b/i,
  /\bdesign studio\b/i,
  /\bcreative studio\b/i,
  /\bproduction studio\b/i,
  /\bagency of record\b/i,
  /\bfor our clients?\b/i,
  /\bour clients?\b/i,
  /\bon behalf of\b/i,
  /\bclient projects?\b/i,
  /\bmultiple clients\b/i,
  /\bserv(e|ing) clients\b/i,
  /\bwhite[- ]label\b/i,
  /\bsubcontract(?:or|ing)?\b/i,
  /\bvendor partner\b/i,
];

const PRODUCT_EVIDENCE: RegExp[] = [
  /\bour product\b/i,
  /\bour platform\b/i,
  /\bour app\b/i,
  /\bour software\b/i,
  /\bweb[- ]based product\b/i,
  /\bproduct currently in development\b/i,
  /\bproduct in development\b/i,
  /\bsaas\b/i,
  /\bsoftware as a service\b/i,
  /\bstartup\b/i,
  /\btraining platform\b/i,
  /\bproduct team\b/i,
  /\bown product\b/i,
  /\bour users?\b/i,
  /\bend users\b/i,
  /\bimprove (?:the )?(?:usability|experience) of (?:a |our |the )?(?:web[- ]based )?(?:product|platform|app)\b/i,
  /\b(?:platform|product|app|software) currently in development\b/i,
];

function hasEvidence(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

function postingText(
  jobText: string,
  roleTitle?: string | null,
  jobTitle?: string | null,
): string {
  return [jobTitle, roleTitle, jobText].filter(Boolean).join("\n");
}

/** Require explicit posting evidence; otherwise return unknown (ignore LLM guess). */
export function sanitizeEmployerType(
  jobText: string,
  parsed: Pick<ParsedJob, "employerType" | "roleTitle">,
  jobTitle?: string | null,
): NonNullable<ParsedJob["employerType"]> {
  const text = postingText(jobText, parsed.roleTitle, jobTitle);
  const agencyEvidence = hasEvidence(text, AGENCY_EVIDENCE);
  const productEvidence = hasEvidence(text, PRODUCT_EVIDENCE);

  if (agencyEvidence && !productEvidence) return "agency";
  if (productEvidence && !agencyEvidence) return "product_company";
  if (agencyEvidence && productEvidence) {
    if (/\bour (?:product|platform|app|software)\b/i.test(text)) {
      return "product_company";
    }
    return "unknown";
  }

  return "unknown";
}
