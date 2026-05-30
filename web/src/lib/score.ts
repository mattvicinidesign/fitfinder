import type { Recommendation } from "@/lib/types";

/** Tailwind text color class for a 0–100 score. */
export function scoreColor(score: number): string {
  if (score >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 60) return "text-amber-600 dark:text-amber-400";
  if (score >= 40) return "text-orange-600 dark:text-orange-400";
  return "text-rose-600 dark:text-rose-400";
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
    case "long_shot":
      return "warning";
    case "not_recommended":
      return "negative";
  }
}
