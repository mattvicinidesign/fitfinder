import type { ParsedJob, PostingContext } from "@/lib/types";

export function buildPostingContextLabel(
  employerType: PostingContext["employerType"],
  hireTarget: PostingContext["hireTarget"],
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

const EMPLOYER = ["agency", "product_company", "unknown"] as const;
const HIRE = ["freelancer", "agency", "direct_hire", "unknown"] as const;

function pickEnum<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : null;
}

/** Derive posting context from parsed job (or API payload). Not used in scoring. */
export function resolvePostingContext(
  job: ParsedJob,
  fromApi?: PostingContext | null,
): PostingContext {
  if (fromApi?.label) {
    return fromApi;
  }

  const employerType =
    pickEnum(job.employerType, EMPLOYER) ?? "unknown";
  const hireTarget = pickEnum(job.hireTarget, HIRE) ?? "unknown";
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
