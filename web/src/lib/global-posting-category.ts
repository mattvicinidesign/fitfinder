/**
 * Global posting fields — extracted from the job description when scanned.
 * Display only: no score influence, no profile/resume matching.
 */

import { POSTING_DETAIL_MISSING, type PostingDetailRow } from "@/lib/posting-details";

/** Code category id for JD-only posting metadata. */
export const GLOBAL_POSTING_CATEGORY_ID = "global" as const;

export type GlobalPostingCategoryId = typeof GLOBAL_POSTING_CATEGORY_ID;

export const GLOBAL_POSTING_CATEGORY_LABEL = "Global";

export const GLOBAL_POSTING_MISSING_LABEL = "N/A";

/** Fields in the Global category (both guest and registered). */
export const GLOBAL_POSTING_FIELD_DEFS = [
  { key: "hireArea", title: "Who Can Apply" },
  { key: "datePosted", title: "Date posted" },
] as const;

export type GlobalPostingFieldKey =
  (typeof GLOBAL_POSTING_FIELD_DEFS)[number]["key"];

export const GLOBAL_POSTING_FIELD_KEYS: GlobalPostingFieldKey[] =
  GLOBAL_POSTING_FIELD_DEFS.map((d) => d.key);

export function isGlobalPostingFieldKey(key: string): key is GlobalPostingFieldKey {
  return (GLOBAL_POSTING_FIELD_KEYS as string[]).includes(key);
}

export interface GlobalPostingFieldDisplay {
  key: GlobalPostingFieldKey;
  title: string;
  /** Raw value from the JD scan, or null when not found. */
  value: string | null;
  found: boolean;
  /** Value when found; {@link GLOBAL_POSTING_MISSING_LABEL} when not. */
  displayLabel: string;
}

function postingRowByKey(
  rows: PostingDetailRow[],
  key: string,
): PostingDetailRow | undefined {
  return rows.find((r) => r.key === key);
}

export function formatGlobalPostingDisplayValue(
  row: PostingDetailRow | undefined,
): string {
  if (!row || row.missing) return GLOBAL_POSTING_MISSING_LABEL;
  const trimmed = row.value.trim();
  if (!trimmed || trimmed === POSTING_DETAIL_MISSING) {
    return GLOBAL_POSTING_MISSING_LABEL;
  }
  return trimmed;
}

/** Build Global category display rows from parsed posting detail rows. */
export function buildGlobalPostingFields(
  rows: PostingDetailRow[],
): GlobalPostingFieldDisplay[] {
  return GLOBAL_POSTING_FIELD_DEFS.map(({ key, title }) => {
    const row = postingRowByKey(rows, key);
    const found = Boolean(row && !row.missing);
    const displayLabel = formatGlobalPostingDisplayValue(row);
    return {
      key,
      title,
      value: found ? row!.value : null,
      found,
      displayLabel,
    };
  });
}
