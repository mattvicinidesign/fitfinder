// Display order + nominal weights (mirror supabase/functions/_shared/scoring_constants.ts).

import type { CategoryKey } from "@/lib/types";

export const REGISTERED_WEIGHT_ROWS: { key: CategoryKey; label: string; weight: number }[] = [
  { key: "skills", label: "Skills", weight: 25 },
  { key: "industry", label: "Industry", weight: 18 },
  { key: "tools", label: "Tools", weight: 12 },
  { key: "aiEmphasis", label: "AI Emphasis", weight: 10 },
  { key: "archetype", label: "Archetype", weight: 7 },
  { key: "softwareModel", label: "Software Model", weight: 5 },
  { key: "compensation", label: "Compensation", weight: 5 },
  { key: "country", label: "Country", weight: 2 },
  { key: "timezone", label: "Timezone", weight: 1 },
];

export const GUEST_WEIGHT_ROWS: { key: CategoryKey; label: string; weight: number }[] = [
  { key: "skills", label: "Skills", weight: 50 },
  { key: "industry", label: "Industry", weight: 30 },
  { key: "aiEmphasis", label: "AI Emphasis", weight: 20 },
];
