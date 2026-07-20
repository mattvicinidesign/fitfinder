import type { CompetencyMatchResult } from "./types.ts";

export function partitionMatches(matches: CompetencyMatchResult[]) {
  const matched: CompetencyMatchResult[] = [];
  const partial: CompetencyMatchResult[] = [];
  const missing: CompetencyMatchResult[] = [];

  for (const m of matches) {
    if (m.matchKind === "missing" || m.similarityScore < 20) {
      missing.push(m);
    } else if (m.matchKind === "partial" || m.matchKind === "weak") {
      partial.push(m);
    } else {
      matched.push(m);
    }
  }

  return { matched, partial, missing };
}
