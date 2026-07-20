import type { ImportanceLevel, MatchKind } from "./types.ts";

export function importanceWeight(importance: ImportanceLevel): number {
  switch (importance) {
    case "required":
      return 1;
    case "preferred":
      return 0.6;
    case "bonus":
      return 0.25;
    default:
      return 1;
  }
}

export function matchKindFromScore(score: number): MatchKind {
  if (score >= 95) return "exact";
  if (score >= 80) return "strong";
  if (score >= 50) return "partial";
  if (score >= 20) return "weak";
  return "missing";
}

export function evidenceBoost(evidenceCount: number): number {
  if (evidenceCount >= 4) return 8;
  if (evidenceCount >= 2) return 4;
  if (evidenceCount >= 1) return 0;
  return -5;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
