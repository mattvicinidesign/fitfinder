import type { Compensation } from "@/lib/types";

type ProfileCompRow = {
  desired_compensation?: number | null;
  desired_compensation_min?: number | null;
  desired_compensation_max?: number | null;
  desired_compensation_currency?: string | null;
  desired_compensation_period?: string | null;
};

/** Build desired pay from profile (range or legacy single annual). */
export function compensationFromProfileRow(
  row: ProfileCompRow | null | undefined,
): Compensation | null {
  if (!row) return null;

  const periodRaw = row.desired_compensation_period;
  const period =
    periodRaw === "hour" || periodRaw === "month" || periodRaw === "year"
      ? periodRaw
      : null;

  const min =
    row.desired_compensation_min != null
      ? Number(row.desired_compensation_min)
      : null;
  const max =
    row.desired_compensation_max != null
      ? Number(row.desired_compensation_max)
      : null;

  if (min != null || max != null) {
    return {
      min,
      max: max ?? min,
      currency: row.desired_compensation_currency ?? "USD",
      period: period ?? (min != null ? "hour" : "year"),
    };
  }

  if (row.desired_compensation != null) {
    const n = Number(row.desired_compensation);
    return { min: n, max: n, currency: "USD", period: "year" };
  }

  return null;
}
