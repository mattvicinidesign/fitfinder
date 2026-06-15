import { COMPANY_TYPE_OPTIONS } from "@/lib/onboarding-options";
import type { ParsedJob, PostingContext } from "@/lib/types";

const LEGACY_COMPANY_LABELS: Record<string, string> = {
  "Scale-Up": "Startup",
  "Founder-Led": "Startup",
};

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizePreferredCompanyTypes(types: string[] | null | undefined): string[] {
  const allowed = new Set<string>(COMPANY_TYPE_OPTIONS);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of types ?? []) {
    const label = LEGACY_COMPANY_LABELS[raw] ?? raw.trim();
    if (!label || !allowed.has(label) || seen.has(label)) continue;
    seen.add(label);
    out.push(label);
  }
  return out;
}

/** Mirrors supabase/functions/_shared/profile_scoring.ts inferJobCompanyTypes. */
export function inferJobCompanyTypes(
  job: ParsedJob,
  posting: PostingContext | null | undefined,
  blob: string,
): string[] {
  const labels = new Set<string>();

  if (posting?.employerType === "agency" || job.employerType === "agency") {
    labels.add("Agency");
  }
  if (/\bstartup\b|\bearly[- ]?stage\b|\bseed stage\b/.test(blob)) {
    labels.add("Startup");
  }
  if (
    /\bscale[- ]?up\b|\bseries [abc]\b|\bgrowth stage\b|\bfounder[- ]?led\b|\bfounder led\b|\bfounder's vision\b/.test(
      blob,
    )
  ) {
    labels.add("Startup");
  }
  if (/\benterprise\b|\bfortune 500\b|\bglobal company\b/.test(blob)) {
    labels.add("Enterprise");
  }

  return [...labels];
}

function preferenceOverlap(selected: string[], inferred: string[]): string[] {
  if (selected.length === 0 || inferred.length === 0) return [];
  const inferredNorm = new Set(inferred.map(normalizeText));
  return selected.filter((label) => inferredNorm.has(normalizeText(label)));
}

function buildJobBlob(
  job: ParsedJob,
  jobDescription?: string | null,
  jobTitle?: string | null,
): string {
  return normalizeText(
    [
      jobTitle ?? "",
      job.roleTitle ?? "",
      jobDescription ?? "",
      job.postingContextDetail ?? "",
      ...(job.skills ?? []),
      ...(job.industries ?? []),
      ...(job.workflows ?? []),
      ...(job.toolRequirements ?? []),
      ...(job.aiRequirements ?? []),
      ...(job.softwareModels ?? []),
    ].join(" "),
  );
}

export interface EmployerTypeMatchDetail {
  badgeLabel: string;
  identified: boolean;
  /** Compare against onboarding prefs — show match/mismatch pills. */
  compareToProfile: boolean;
  matched: boolean;
  points: number | null;
}

export function buildEmployerTypeMatchDetail({
  parsedJob,
  postingContext,
  jobDescription,
  jobTitle,
  profilePreferredCompanyTypes,
}: {
  parsedJob?: ParsedJob;
  postingContext?: PostingContext | null;
  jobDescription?: string | null;
  jobTitle?: string | null;
  profilePreferredCompanyTypes?: string[] | null;
}): EmployerTypeMatchDetail {
  if (!parsedJob) {
    return {
      badgeLabel: "",
      identified: false,
      compareToProfile: false,
      matched: false,
      points: null,
    };
  }

  const employerType =
    postingContext?.employerType ?? parsedJob.employerType ?? "unknown";
  const blob = buildJobBlob(parsedJob, jobDescription, jobTitle);
  const inferred = inferJobCompanyTypes(parsedJob, postingContext, blob);
  const userPrefs = normalizePreferredCompanyTypes(profilePreferredCompanyTypes);

  let badgeLabel: string;
  if (inferred.length > 0) {
    badgeLabel = inferred.join(", ");
  } else if (employerType === "agency") {
    badgeLabel = "Agency";
  } else if (employerType === "product_company") {
    badgeLabel = "Company";
  } else {
    return {
      badgeLabel: "",
      identified: false,
      compareToProfile: false,
      matched: false,
      points: null,
    };
  }

  const identified = employerType !== "unknown" || inferred.length > 0;
  if (!identified) {
    return {
      badgeLabel: "",
      identified: false,
      compareToProfile: false,
      matched: false,
      points: null,
    };
  }

  if (userPrefs.length === 0 || inferred.length === 0) {
    return {
      badgeLabel,
      identified: true,
      compareToProfile: false,
      matched: false,
      points: null,
    };
  }

  const overlap = preferenceOverlap(userPrefs, inferred);
  const matched = overlap.length > 0;

  return {
    badgeLabel,
    identified: true,
    compareToProfile: true,
    matched,
    points: matched ? 100 : 0,
  };
}
