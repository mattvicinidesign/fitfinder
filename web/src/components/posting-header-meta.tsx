"use client";

import { buildPostingHeaderMetaLine } from "@/lib/posting-header-meta";
import type { ParsedJob, PostingContext } from "@/lib/types";

/** Platform | employer kind | date posted under the job title. */
export function PostingHeaderMetaFields({
  parsedJob,
  jobDescription,
  jobTitle,
  companyName,
  postingContext,
}: {
  parsedJob?: ParsedJob;
  jobDescription?: string | null;
  jobTitle?: string | null;
  companyName?: string | null;
  postingContext?: PostingContext | null;
}) {
  const line = buildPostingHeaderMetaLine({
    parsedJob,
    jobDescription,
    jobTitle,
    companyName,
    postingContext,
  });

  if (!line) return null;

  return (
    <p className="text-[14px] text-muted-foreground leading-snug pt-0.5">
      {line}
    </p>
  );
}
