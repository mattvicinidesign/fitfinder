import {
  NEGATIVE_ROLE_ARCHETYPES,
  POSITIVE_ROLE_ARCHETYPES,
} from "./opportunity_engine_constants.ts";

export type RoleArchetypeTier = "positive" | "negative" | "neutral" | "unknown";

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function includesArchetype(blob: string, archetype: string): boolean {
  const norm = normalize(archetype);
  if (!norm) return false;
  return blob.includes(norm);
}

function detectArchetypeLabel(blob: string, list: string[]): string | null {
  for (const label of list) {
    if (includesArchetype(blob, label)) return label;
  }
  return null;
}

export function detectRoleArchetype(
  jobTitle: string | null | undefined,
  jobBlob: string,
): { tier: RoleArchetypeTier; label: string | null; score: number } {
  const blob = normalize([jobTitle ?? "", jobBlob].join(" "));
  if (!blob.trim()) {
    return { tier: "unknown", label: null, score: 50 };
  }

  const negative = detectArchetypeLabel(blob, NEGATIVE_ROLE_ARCHETYPES);
  if (negative) {
    return { tier: "negative", label: negative, score: 20 };
  }

  const positive = detectArchetypeLabel(blob, POSITIVE_ROLE_ARCHETYPES);
  if (positive) {
    return { tier: "positive", label: positive, score: 92 };
  }

  if (/\bdesigner\b|\bux\b|\bproduct design\b/.test(blob)) {
    return { tier: "neutral", label: "Designer (unspecified)", score: 55 };
  }

  return { tier: "unknown", label: null, score: 50 };
}
