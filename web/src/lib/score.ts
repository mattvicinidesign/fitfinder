import type { Recommendation } from "@/lib/types";

/** Tailwind text color class for a 0–100 score. */
export function scoreColor(score: number): string {
  if (score >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 60) return "text-amber-600 dark:text-amber-400";
  if (score >= 40) return "text-orange-600 dark:text-orange-400";
  return "text-rose-600 dark:text-rose-400";
}

/** Fill color for a 0–100 progress bar (pairs with scoreColor). */
export function scoreProgressClass(score: number): string {
  if (score >= 80) return "bg-emerald-600 dark:bg-emerald-500";
  if (score >= 60) return "bg-amber-600 dark:bg-amber-500";
  if (score >= 40) return "bg-orange-600 dark:bg-orange-500";
  return "bg-rose-600 dark:bg-rose-500";
}

/** Badge variant intent for a recommendation. */
export function recommendationTone(
  rec: Recommendation,
): "positive" | "neutral" | "warning" | "negative" {
  switch (rec) {
    case "strong_apply":
    case "apply":
      return "positive";
    case "stretch":
      return "neutral";
    case "not_recommended":
      return "negative";
  }
}
