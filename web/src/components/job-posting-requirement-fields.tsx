"use client";

import { SummaryFieldLabel } from "@/components/summary-field-label";
import { SummaryInfoBadge } from "@/components/summary-info-badge";
import {
  jobCountryRequirementDisplay,
  jobTimezoneRequirementDisplay,
  type JobPostingRequirementDisplay,
} from "@/lib/job-posting-requirements";
import type { ParsedJob } from "@/lib/types";

function RequirementRow({
  title,
  display,
}: {
  title: string;
  display: JobPostingRequirementDisplay;
}) {
  return (
    <div className="space-y-1.5 min-w-0" role="group" aria-label={display.statusLine}>
      <SummaryFieldLabel>{title}</SummaryFieldLabel>
      <SummaryInfoBadge
        label={display.badgeLabel}
        muted={!display.hasExplicitRequirement}
        positive={display.positive}
      />
    </div>
  );
}

/** Country / timezone requirements extracted from the job parse. */
export function JobPostingRequirementFields({
  parsedJob,
  jobDescription,
}: {
  parsedJob?: ParsedJob;
  jobDescription?: string | null;
}) {
  if (!parsedJob && !jobDescription?.trim()) return null;

  const options = { jobDescription };
  const country = jobCountryRequirementDisplay(parsedJob, options);
  const timezone = jobTimezoneRequirementDisplay(parsedJob, options);

  return (
    <div className="grid grid-cols-1 gap-3 min-w-0 sm:grid-cols-2">
      <RequirementRow title="Country preferred" display={country} />
      <RequirementRow title="Timezone preferred" display={timezone} />
    </div>
  );
}
