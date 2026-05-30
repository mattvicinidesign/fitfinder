// Display order + nominal weights (mirror supabase/functions/_shared/scoring_constants.ts).

import type { CategoryKey } from "@/lib/types";

/** Mirrors scoring_constants — section totals: Qualifications 45, Role 25, Profile 20, Preferences 10. */
export const REGISTERED_WEIGHT_ROWS: { key: CategoryKey; label: string; weight: number }[] = [
  { key: "skills", label: "Skills", weight: 30 },
  { key: "tools", label: "Tools", weight: 15 },
  { key: "industry", label: "Industry", weight: 20 },
  { key: "timezone", label: "Timezone", weight: 20 },
  { key: "aiEmphasis", label: "AI Emphasis", weight: 8 },
  { key: "compensation", label: "Compensation", weight: 5 },
  { key: "country", label: "Country", weight: 2 },
];

export const GUEST_WEIGHT_ROWS: { key: CategoryKey; label: string; weight: number }[] = [
  { key: "skills", label: "Skills", weight: 45 },
  { key: "industry", label: "Industry", weight: 25 },
  { key: "aiEmphasis", label: "AI Emphasis", weight: 10 },
];
