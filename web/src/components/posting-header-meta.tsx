"use client";

import { getPostingDetailBadgeIcon } from "@/lib/posting-detail-highlights";
import { POSTING_DETAIL_MISSING, resolvePostingDetailSections } from "@/lib/posting-details";
import type { ParsedJob } from "@/lib/types";

function toTitleCaseWords(text: string): string {
  return text.replace(/\b\w+/g, (word) =>
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
  );
}

function headerMetaSegment(
  key: string,
  value: string,
  titleCase = false,
): string | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed === POSTING_DETAIL_MISSING) return null;

  const display = titleCase ? toTitleCaseWords(trimmed) : trimmed;
  const icon = getPostingDetailBadgeIcon(key, trimmed);
  return icon ? `${icon} ${display}` : display;
}

/** Who Can Apply and Date posted as one line under the job title. */
export function PostingHeaderMetaFields({
  parsedJob,
  jobDescription,
  jobTitle,
}: {
  parsedJob?: ParsedJob;
  jobDescription?: string | null;
  jobTitle?: string | null;
}) {
  if (!parsedJob) return null;

  const roleSection = resolvePostingDetailSections(parsedJob, {
    jobDescription,
    jobTitle,
  }).find((s) => s.id === "role");

  const whoCanApplyRow = roleSection?.rows.find((r) => r.key === "hireArea");
  const datePostedRow = roleSection?.rows.find((r) => r.key === "datePosted");

  const segments = [
    whoCanApplyRow
      ? headerMetaSegment("hireArea", whoCanApplyRow.value)
      : null,
    datePostedRow
      ? headerMetaSegment("datePosted", datePostedRow.value, true)
      : null,
  ].filter((s): s is string => s != null);

  if (segments.length === 0) return null;

  return (
    <p className="text-[14px] text-muted-foreground leading-snug pt-0.5">
      {segments.join(" | ")}
    </p>
  );
}
