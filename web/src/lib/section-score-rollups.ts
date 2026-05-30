/**
 * Report section rollups — partial weighted scores per summary card.
 * Section weights (of overall 100): Qualifications 45, Role 25, Client Profile 20, Preferences 10.
 * Ring score = weighted sum of section subtotals (renormalized when a section is unknown).
 */

import { GUEST_WEIGHT_ROWS, REGISTERED_WEIGHT_ROWS } from "@/lib/scoring-weights";
import type { CategoryKey, CategoryScore } from "@/lib/types";

export type ReportSectionId =
  | "clientProfile"
  | "clientPreferences"
  | "roleDetails"
  | "categoryMatching";

/** Share of overall score per summary card (sums to 100). */
export const REPORT_SECTION_WEIGHTS: Record<ReportSectionId, number> = {
  categoryMatching: 45,
  roleDetails: 25,
  clientProfile: 20,
  clientPreferences: 10,
};

export interface ReportSectionRollup {
  id: ReportSectionId;
  title: string;
  /** 0–100 partial score, or null when no scored categories in this section. */
  score: number | null;
}

const REGISTERED_SECTIONS: {
  id: ReportSectionId;
  title: string;
  categories: CategoryKey[];
}[] =
  [
    { id: "clientProfile", title: "Client Profile", categories: ["timezone"] },
    {
      id: "clientPreferences",
      title: "Client Preferences",
      categories: ["country", "aiEmphasis"],
    },
    {
      id: "roleDetails",
      title: "Role Details",
      categories: ["industry", "compensation"],
    },
    {
      id: "categoryMatching",
      title: "Qualifications",
      categories: ["skills", "tools"],
    },
  ];

const GUEST_SECTIONS: {
  id: ReportSectionId;
  title: string;
  categories: CategoryKey[];
}[] = [
  {
    id: "clientPreferences",
    title: "Client Preferences",
    categories: ["aiEmphasis"],
  },
  { id: "roleDetails", title: "Role Details", categories: ["industry"] },
  { id: "categoryMatching", title: "Qualifications", categories: ["skills"] },
];

function weightMap(
  rows: { key: CategoryKey; weight: number }[],
): Map<CategoryKey, number> {
  return new Map(rows.map((r) => [r.key, r.weight]));
}

function partialScore(
  breakdown: CategoryScore[],
  keys: CategoryKey[],
  weights: Map<CategoryKey, number>,
): number | null {
  let weighted = 0;
  let totalWeight = 0;

  for (const key of keys) {
    const row = breakdown.find((c) => c.category === key);
    if (!row || row.status === "unknown") continue;
    const w = weights.get(key) ?? 0;
    if (w <= 0) continue;
    weighted += row.score * w;
    totalWeight += w;
  }

  if (totalWeight === 0) return null;
  return Math.round(weighted / totalWeight);
}

export function computeReportSectionRollups(
  breakdown: CategoryScore[],
  isGuest: boolean,
): ReportSectionRollup[] {
  const sections = isGuest ? GUEST_SECTIONS : REGISTERED_SECTIONS;
  const weights = weightMap(isGuest ? GUEST_WEIGHT_ROWS : REGISTERED_WEIGHT_ROWS);

  return sections.map(({ id, title, categories }) => ({
    id,
    title,
    score: partialScore(breakdown, categories, weights),
  }));
}

/** Partial weighted score for one summary card (matches Score Summary rollups). */
export function sectionRollupScore(
  breakdown: CategoryScore[],
  isGuest: boolean,
  sectionId: ReportSectionId,
): number | null {
  return (
    computeReportSectionRollups(breakdown, isGuest).find((s) => s.id === sectionId)
      ?.score ?? null
  );
}

/**
 * Overall report fit score (0–100) from section subtotals and REPORT_SECTION_WEIGHTS.
 * Unknown sections are omitted; remaining weights renormalize to 100%.
 */
export function computeWeightedReportScore(
  breakdown: CategoryScore[],
  isGuest: boolean,
): number | null {
  const rollups = computeReportSectionRollups(breakdown, isGuest);
  let weighted = 0;
  let totalWeight = 0;

  for (const { id, score } of rollups) {
    if (score == null) continue;
    const w = REPORT_SECTION_WEIGHTS[id];
    weighted += score * w;
    totalWeight += w;
  }

  if (totalWeight === 0) return null;
  return Math.round(weighted / totalWeight);
}
