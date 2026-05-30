// Posting context classification — informational only; never used in scoring.

import type { ParsedJob } from "./types.ts";

export type EmployerType = "agency" | "product_company" | "unknown";
export type HireTarget = "freelancer" | "agency" | "direct_hire" | "unknown";

export interface PostingContext {
  employerType: EmployerType;
  hireTarget: HireTarget;
  /** Short line for the qualifications breakdown UI. */
  label: string;
  /** Optional one-sentence rationale from the parser. */
  detail: string | null;
}

function normalizeEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
): T | null {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : null;
}

/** Build display copy from employer + hire target. Does not affect scoring. */
export function buildPostingContextLabel(
  employerType: EmployerType,
  hireTarget: HireTarget,
): string {
  if (employerType === "agency" && hireTarget === "freelancer") {
    return "Agency looking for a freelancer";
  }
  if (employerType === "agency" && hireTarget === "agency") {
    return "Agency hiring another agency";
  }
  if (employerType === "agency" && hireTarget === "direct_hire") {
    return "Agency hiring directly (staff / employee)";
  }
  if (employerType === "product_company" && hireTarget === "freelancer") {
    return "Product company hiring a freelancer";
  }
  if (employerType === "product_company" && hireTarget === "agency") {
    return "Product company hiring an agency";
  }
  if (employerType === "product_company" && hireTarget === "direct_hire") {
    return "Product company hiring directly";
  }
  if (employerType === "agency") {
    return "Agency posting (hire type unclear)";
  }
  if (employerType === "product_company") {
    return "Product company posting (hire type unclear)";
  }
  if (hireTarget === "freelancer") {
    return "Freelancer engagement (employer type unclear)";
  }
  if (hireTarget === "agency") {
    return "Hiring an agency (employer type unclear)";
  }
  if (hireTarget === "direct_hire") {
    return "Direct hire (employer type unclear)";
  }
  return "Posting type unclear";
}

export function resolvePostingContext(job: ParsedJob): PostingContext {
  const employerType =
    normalizeEnum(job.employerType, ["agency", "product_company", "unknown"] as const) ??
    "unknown";
  const hireTarget =
    normalizeEnum(job.hireTarget, ["freelancer", "agency", "direct_hire", "unknown"] as const) ??
    "unknown";

  const detail =
    typeof job.postingContextDetail === "string" && job.postingContextDetail.trim()
      ? job.postingContextDetail.trim()
      : null;

  return {
    employerType,
    hireTarget,
    label: buildPostingContextLabel(employerType, hireTarget),
    detail,
  };
}
