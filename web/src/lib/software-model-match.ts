import type { ParsedJob, ParsedResume } from "@/lib/types";

function normalize(token: string): string {
  return token
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findMatch(reqNorm: string, candidates: string[]): string | null {
  for (const raw of candidates) {
    const norm = normalize(raw);
    if (!norm) continue;
    if (norm === reqNorm || norm.includes(reqNorm) || reqNorm.includes(norm)) {
      return raw.trim();
    }
  }
  return null;
}

export interface SoftwareModelItem {
  label: string;
  matched: boolean;
  resumeMatch: string | null;
}

export interface SoftwareModelDetail {
  items: SoftwareModelItem[];
  matched: SoftwareModelItem[];
  missing: SoftwareModelItem[];
}

export function buildSoftwareModelDetail(
  parsedJob?: ParsedJob,
  parsedResume?: ParsedResume | null,
): SoftwareModelDetail | null {
  const required = parsedJob?.softwareModels ?? [];
  if (required.length === 0) return null;

  const candidates = parsedResume?.softwareModels ?? [];
  const items: SoftwareModelItem[] = required.map((label) => {
    const norm = normalize(label);
    const resumeMatch = norm ? findMatch(norm, candidates) : null;
    return { label: label.trim(), matched: resumeMatch !== null, resumeMatch };
  });

  return {
    items,
    matched: items.filter((i) => i.matched),
    missing: items.filter((i) => !i.matched),
  };
}
