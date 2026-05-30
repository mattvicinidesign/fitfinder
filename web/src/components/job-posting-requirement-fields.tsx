"use client";

import { SummaryScoredField } from "@/components/summary-scored-field";
import {
  jobCountryRequirementDisplay,
  jobTimezoneRequirementDisplay,
} from "@/lib/job-posting-requirements";
import type { SectionFieldScore } from "@/lib/section-field-scoring";
import type { ParsedJob } from "@/lib/types";

function requirementField(
  key: string,
  title: string,
  display: ReturnType<typeof jobCountryRequirementDisplay>,
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
  const country = jobCountryRequirementDisplay(parsedJob, options);
  const timezone = jobTimezoneRequirementDisplay(parsedJob, options);

  return (
    <div className="grid grid-cols-1 gap-3 min-w-0 sm:grid-cols-2">
      <SummaryScoredField field={requirementField("countryPreferred", "Country preferred", country)} />
      <SummaryScoredField field={requirementField("timezonePreferred", "Timezone preferred", timezone)} />
    </div>
  );
}
