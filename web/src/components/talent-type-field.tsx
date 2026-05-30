"use client";

import { SummaryFieldLabel } from "@/components/summary-field-label";
import { SummaryInfoBadge } from "@/components/summary-info-badge";
import { talentTypeDisplay } from "@/lib/talent-type-display";

/** Talent Type from Preferred qualifications (Independent → green pill). */
export function TalentTypeField({
  jobDescription,
}: {
  jobDescription?: string | null;
}) {
  const display = talentTypeDisplay(jobDescription);
  if (!display.hasExplicitRequirement) return null;

  return (
    <div className="space-y-1.5 min-w-0" role="group" aria-label={display.statusLine}>
      <SummaryFieldLabel>Talent type</SummaryFieldLabel>
      <SummaryInfoBadge
        label={display.badgeLabel}
        positive={display.positive}
      />
    </div>
  );
}
