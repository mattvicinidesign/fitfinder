// Posting context classification — informational only; never used in scoring.

import type { Compensation, ParsedJob } from "./types.ts";

export type EmployerType = "agency" | "product_company" | "unknown";
export type HireTarget = "freelancer" | "agency" | "direct_hire" | "unknown";
export type EngagementDuration = "ongoing" | "short_term" | "unknown";
export type EngagementPath = "contract_to_hire" | "contract" | "direct_hire" | "unknown";
export type PayStructure = "hourly" | "fixed_price" | "salary" | "unknown";

export interface PostingContext {
  employerType: EmployerType;
  hireTarget: HireTarget;
  label: string;
  detail: string | null;
  engagementDuration: EngagementDuration;
  engagementPath: EngagementPath;
  payStructure: PayStructure;
  badges: string[];
}

const DURATIONS = ["ongoing", "short_term", "unknown"] as const;
const PATHS = ["contract_to_hire", "contract", "direct_hire", "unknown"] as const;
const PAY_STRUCTURES = ["hourly", "fixed_price", "salary", "unknown"] as const;

const DURATION_LABELS: Record<EngagementDuration, string> = {
  ongoing: "Ongoing",
  short_term: "Short-term",
  unknown: "",
};

const PATH_LABELS: Record<EngagementPath, string> = {
  contract_to_hire: "Contract-to-hire",
  contract: "Contract",
  direct_hire: "Direct hire",
  unknown: "",
};

const PAY_LABELS: Record<PayStructure, string> = {
  hourly: "Hourly",
  fixed_price: "Fixed price",
  salary: "Salary",
  unknown: "",
};

function normalizeEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
): T | null {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : null;
}

export function buildPostingContextLabel(
  employerType: EmployerType,
  hireTarget: HireTarget,
): string {
  if (employerType === "agency" && hireTarget === "freelancer") {
    return "Agency looking for a Freelancer";
  }
  if (employerType === "agency" && hireTarget === "agency") {
    return "Agency hiring another agency";
  }
  if (employerType === "agency" && hireTarget === "direct_hire") {
    return "Agency hiring directly (staff / employee)";
  }
  if (employerType === "product_company" && hireTarget === "freelancer") {
    return "Product company hiring a Freelancer";
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

function postingText(job: ParsedJob, jobText?: string | null): string {
  return [jobText, job.postingContextDetail].filter(Boolean).join("\n");
}

function inferDurationFromText(text: string): EngagementDuration {
  const lower = text.toLowerCase();
  if (
    /\bongoing\b|\blong[- ]?term\b|\bretainer\b|\bcontinuous\b|\bpermanent\b|\bsteady\b|\bopen[- ]?ended\b/i.test(
      lower,
    )
  ) {
    return "ongoing";
  }
  if (
    /\bshort[- ]?term\b|\btemporary\b|\bone[- ]?off\b|\bsingle project\b|\bproject[- ]?based\b|\b\d+[- ]?(?:week|month)s?\b/i.test(
      lower,
    )
  ) {
    return "short_term";
  }
  return "unknown";
}

function inferPathFromText(text: string, hireTarget: HireTarget): EngagementPath {
  const lower = text.toLowerCase();
  if (
    /\bcontract[- ]?to[- ]?hire\b|\bcontract to hire\b|\btemp[- ]?to[- ]?perm\b|\bconversion to (?:full|fte)\b/i.test(
      lower,
    )
  ) {
    return "contract_to_hire";
  }
  if (hireTarget === "direct_hire") return "direct_hire";
  if (
    /\bfreelance\b|\bfreelancer\b|\bcontractor\b|\b1099\b|\bcontract role\b|\bindependent\b/i.test(
      lower,
    ) ||
    hireTarget === "freelancer"
  ) {
    return "contract";
  }
  return "unknown";
}

function inferPayFromText(
  text: string,
  compensation: Compensation | null | undefined,
): PayStructure {
  const lower = text.toLowerCase();
  if (
    /\bhourly\b|\bper hour\b|\b\/\s*hr\b|\b\/hour\b|\brate:\s*\$/i.test(lower) ||
    compensation?.period === "hour"
  ) {
    return "hourly";
  }
  if (
    /\bfixed[- ]?(?:price|fee|budget|rate)\b|\bflat fee\b|\blump sum\b|\btotal budget\b|\bfixed bid\b/i.test(
      lower,
    )
  ) {
    return "fixed_price";
  }
  if (
    compensation?.period === "year" ||
    compensation?.period === "month" ||
    /\bsalary\b|\bannual\b|\bper year\b|\b\/year\b|\bw-?2\b|\bfull[- ]?time\b/i.test(lower)
  ) {
    return "salary";
  }
  return "unknown";
}

function resolveEngagementMetadata(
  job: ParsedJob,
  jobText?: string | null,
): Pick<PostingContext, "engagementDuration" | "engagementPath" | "payStructure" | "badges"> {
  const text = postingText(job, jobText);
  const hireTarget =
    normalizeEnum(job.hireTarget, ["freelancer", "agency", "direct_hire", "unknown"] as const) ??
    "unknown";

  const engagementDuration =
    normalizeEnum(job.engagementDuration, DURATIONS) ?? inferDurationFromText(text);
  const engagementPath =
    normalizeEnum(job.engagementPath, PATHS) ?? inferPathFromText(text, hireTarget);
  const payStructure =
    normalizeEnum(job.payStructure, PAY_STRUCTURES) ??
    inferPayFromText(text, job.compensation);

  const badges: string[] = [];
  if (engagementDuration !== "unknown") {
    badges.push(DURATION_LABELS[engagementDuration]);
  }
  if (engagementPath !== "unknown") {
    badges.push(PATH_LABELS[engagementPath]);
  }
  if (payStructure !== "unknown") {
    badges.push(PAY_LABELS[payStructure]);
  }

  return { engagementDuration, engagementPath, payStructure, badges };
}

export function resolvePostingContext(
  job: ParsedJob,
  jobText?: string | null,
): PostingContext {
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

  const meta = resolveEngagementMetadata(job, jobText);

  return {
    employerType,
    hireTarget,
    label: buildPostingContextLabel(employerType, hireTarget),
    detail,
    ...meta,
  };
}
