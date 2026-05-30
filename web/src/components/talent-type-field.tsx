"use client";

import { SummaryScoredField } from "@/components/summary-scored-field";
import { talentTypeDisplay } from "@/lib/talent-type-display";
import type { SectionFieldScore } from "@/lib/section-field-scoring";

/** Talent Type from Preferred qualifications (Independent → green pill). */
export function TalentTypeField({
  jobDescription,
}: {
  jobDescription?: string | null;
}) {
  const display = talentTypeDisplay(jobDescription);
  const field: SectionFieldScore = {
    key: "talentType",
    title: "Type",
    identified: display.hasExplicitRequirement,
    badgeLabel: display.badgeLabel,
    state: display.hasExplicitRequirement
      ? display.positive
        ? "match"
        : "mismatch"
      : "unknown",
    points: display.hasExplicitRequirement
      ? display.positive
        ? 100
        : 0
      : null,
  };

  return <SummaryScoredField field={field} />;
}
