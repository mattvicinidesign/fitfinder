/** Shared section titles for qualification category accordions. */

export function matchedSectionTitle(count: number): string {
  return `Matched (${count})`;
}

export function notMatchedSectionTitle(count: number): string {
  return `In posting, not matched (${count})`;
}

export const IN_POSTING_HEADING = "In posting";
export const MATCHED_VIA_PREFIX = "matched via:";
