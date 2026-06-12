"use client";

import { SummaryScoredField } from "@/components/summary-scored-field";
import {
  jobPreferredLocationDisplay,
  jobTimezoneRequirementDisplay,
} from "@/lib/job-posting-requirements";
import type { SectionFieldScore } from "@/lib/section-field-scoring";
import type { ParsedJob } from "@/lib/types";

function requirementField(
  key: string,
  title: string,
  display: ReturnType<typeof jobPreferredLocationDisplay>,
): SectionFieldScore {
  return {
    key,
    title,
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
}

/** Country / timezone requirements extracted from the job posting. */
export function JobPostingRequirementFields({
  parsedJob,
  jobDescription,
}: {
  parsedJob?: ParsedJob;
  jobDescription?: string | null;
}) {
  const options = { jobDescription };
  const country = jobPreferredLocationDisplay(parsedJob, options);
  const timezone = jobTimezoneRequirementDisplay(parsedJob, options);

  return (
    <div className="grid grid-cols-2 gap-3 min-w-0">
      <SummaryScoredField field={requirementField("locationPreferred", "Location", country)} />
      <SummaryScoredField field={requirementField("timezonePreferred", "Timezone", timezone)} />
    </div>
  );
}
